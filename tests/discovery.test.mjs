import assert from 'node:assert/strict'
import test from 'node:test'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter} from 'react-router'
import {loadTypeScript} from './load-typescript.mjs'
import {contentFixture,contentMocks} from './content-fixture.mjs'

const render=(element,path='/')=>renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:[path]},element))
const search=loadTypeScript('src/lib/localSearch.ts')
const index=level=>search.buildLocalSearchIndex(level,contentFixture.books,contentFixture.labs,contentFixture.domains,contentFixture.roles,contentFixture.branches,contentFixture.career_resources,contentFixture.rooms,contentFixture.faculty,contentFixture.faculty_subjects)

test('old career seed data remains intact during the resource migration',()=>{
  const domains=loadTypeScript('src/data/careers/domains.ts').careerDomains
  const roles=loadTypeScript('src/data/careers/roles.ts').careerRoles
  assert.equal(domains.length,16)
  assert.equal(roles.length,24)
})

test('P1 search includes rooms and faculty but excludes every career result and branch link',()=>{
  const p1=index('P1')
  assert.ok(p1.some(item=>item.type==='I3 Block Room'&&item.title==='Test Office'))
  assert.ok(p1.some(item=>item.type==='Faculty Subject'&&item.title==='Mathematics'))
  assert.ok(p1.some(item=>item.type==='Faculty Member'&&item.title==='Test Faculty'))
  assert.ok(!p1.some(item=>item.to.startsWith('/careers/')||item.type==='Branch'))
  assert.ok(!search.searchLocalResources(p1,'VLSI').some(item=>item.type.includes('Career')))
})

test('E1 search uses published resource records and allows every branch',()=>{
  const e1=index('E1')
  assert.ok(e1.some(item=>item.type==='Career Domain Resource'&&item.title==='Test VLSI Guide'&&item.to.includes('branch=ece')))
  assert.ok(e1.some(item=>item.type==='Career Job Resource'&&item.title==='Test Software Job Guide'&&item.to.includes('branch=cse')))
  assert.ok(!e1.some(item=>item.title===contentFixture.domains[0].name&&item.type==='Career Domain'))
  for(const result of e1.filter(item=>['Book','Subject','Lab','Experiment'].includes(item.type)))assert.ok(result.to.includes('/e1/'))
})

test('career libraries show branch tabs, PDFs and truthful download actions',()=>{
  const domains=loadTypeScript('src/pages/CareerDomainsPage.tsx',contentMocks).CareerDomainsPage
  const jobs=loadTypeScript('src/pages/CareerJobsPage.tsx',contentMocks).CareerJobsPage
  const domainHtml=render(createElement(domains),'/careers/domains?branch=ece')
  const jobHtml=render(createElement(jobs),'/careers/jobs?branch=cse')
  assert.ok(domainHtml.includes('Test VLSI Guide'))
  assert.ok(domainHtml.includes('View PDF'))
  assert.ok(!domainHtml.includes('Download PDF'))
  assert.ok(jobHtml.includes('Test Software Job Guide'))
  assert.ok(jobHtml.includes('Download PDF'))
  for(const branch of contentFixture.branches)assert.ok(domainHtml.includes(branch.shortName||branch.name))
  assert.ok(!domainHtml.includes(contentFixture.domains[0].overview))
})

test('career domain and job video actions use the shared safe YouTube parser',()=>{
  const {CareerResourceCard,CareerVideoEmbed}=loadTypeScript('src/pages/CareerResourceLibrary.tsx',contentMocks)
  const parser=loadTypeScript('src/lib/labVideoSource.ts')
  const domain=contentFixture.career_resources[0]
  const job=contentFixture.career_resources[1]
  assert.equal(parser.youtubeVideoId(domain.youtube_url),'dQw4w9WgXcQ')
  assert.equal(parser.youtubeVideoId(job.youtube_url),'dQw4w9WgXcQ')
  for(const item of [domain,job]){
    const html=render(createElement(CareerResourceCard,{item,branch:'Test Branch'}))
    assert.ok(html.includes('Watch Video'))
    assert.ok(html.includes('View PDF'))
    assert.ok(!html.includes('<iframe'))
  }
  const noVideo=render(createElement(CareerResourceCard,{item:{...domain,youtube_url:null},branch:'Test Branch'}))
  assert.ok(!noVideo.includes('Watch Video')&&noVideo.includes('View PDF'))
  const videoOnly=render(createElement(CareerResourceCard,{item:{...domain,pdf_url:null,supporting_url:null},branch:'Test Branch'}))
  assert.ok(videoOnly.includes('Watch Video')&&!videoOnly.includes('View PDF')&&!videoOnly.includes('Download PDF'))
  const bad=render(createElement(CareerResourceCard,{item:{...domain,youtube_url:'<iframe src="javascript:alert(1)"></iframe>'},branch:'Test Branch'}))
  assert.ok(!bad.includes('Watch Video')&&!bad.includes('<iframe'))
  const embed=render(createElement(CareerVideoEmbed,{id:'dQw4w9WgXcQ',title:'Test video'}))
  assert.ok(embed.includes('youtube-nocookie.com/embed/dQw4w9WgXcQ'))
  assert.ok(embed.includes('autoplay=0'))
})

test('P1 Explore shows campus and faculty, while E1 Explore shows career resource links',()=>{
  const p1Mocks={...contentMocks,'../contexts/AuthContext':{useAuth:()=>({profile:{academicLevel:'P1'}})}}
  const e1Mocks={...contentMocks,'../contexts/AuthContext':{useAuth:()=>({profile:{academicLevel:'E1'}})}}
  const p1=render(createElement(loadTypeScript('src/pages/ExplorePage.tsx',p1Mocks).ExplorePage),'/explore')
  const e1=render(createElement(loadTypeScript('src/pages/ExplorePage.tsx',e1Mocks).ExplorePage),'/explore')
  assert.ok(p1.includes('I3 Block Rooms')&&p1.includes('Faculty Directory'))
  assert.ok(!p1.includes('Career Domains')&&!p1.includes('Career Jobs'))
  assert.ok(e1.includes('Career Domains')&&e1.includes('Career Jobs'))
})

test('P1 direct career route is redirected and E1 route is allowed',()=>{
  const p1=loadTypeScript('src/components/E1Route.tsx',{'../contexts/AuthContext':{useAuth:()=>({profile:{academicLevel:'P1'}})}}).E1Route()
  const e1=loadTypeScript('src/components/E1Route.tsx',{'../contexts/AuthContext':{useAuth:()=>({profile:{academicLevel:'E1'}})}}).E1Route()
  assert.equal(p1.props.to,'/dashboard')
  assert.equal(p1.props.replace,true)
  assert.notEqual(e1.props.to,'/dashboard')
})

test('resource finder changes P1 campus and E1 career links by level',()=>{
  const {ResourceFinder}=loadTypeScript('src/pages/ExplorePage.tsx',{...contentMocks,'../contexts/AuthContext':{useAuth:()=>({profile:{academicLevel:'P1'}})}})
  const p1=render(createElement(ResourceFinder,{level:'P1'}))
  const e1=render(createElement(ResourceFinder,{level:'E1'}))
  assert.ok(p1.includes('Campus')&&!p1.includes('Careers'))
  assert.ok(e1.includes('Careers')&&!e1.includes('Campus'))
})

test('rooms search and faculty subject filtering render only matching directory entries',()=>{
  const rooms=loadTypeScript('src/pages/RoomsPage.tsx',contentMocks)
  const faculty=loadTypeScript('src/pages/FacultyPage.tsx',contentMocks)
  assert.equal(rooms.filterRooms(contentFixture.rooms,'QA-201','').length,1)
  assert.equal(rooms.filterRooms(contentFixture.rooms,'test','Third').length,0)
  assert.equal(faculty.facultyForSubject(contentFixture.faculty,'faculty-subject-1').length,1)
  assert.equal(faculty.facultyForSubject(contentFixture.faculty,'other').length,0)
  const roomHtml=render(createElement(rooms.RoomsPage))
  const facultyHtml=render(createElement(faculty.FacultyPage))
  assert.ok(roomHtml.includes('Test Office')&&roomHtml.includes('tel:08656123456'))
  assert.ok(facultyHtml.includes('Test Faculty')&&facultyHtml.includes('Mathematics'))
})

test('student problem cards show resolved status and counts without private identifiers',()=>{
  const {ProblemCard}=loadTypeScript('src/pages/ProblemsPage.tsx',{
    ...contentMocks,'../contexts/AuthContext':{useAuth:()=>({profile:{academicLevel:'P1'}})},
    '../lib/problemApi':{problemApi:{}}
  })
  const item={id:'report-1',title:'Test water supply',description:'Water is unavailable in a test block.',academic_level:'P1',category:'Infrastructure',priority:'high',status:'resolved',likes:3,dislikes:1,created_at:'2026-09-27T00:00:00Z',author_identifier:'private-test-only'}
  const html=render(createElement(ProblemCard,{item,onReact:()=>{}}))
  assert.ok(html.includes('RESOLVED')&&html.includes('HIGH PRIORITY'))
  assert.ok(html.includes('👍 3')&&html.includes('👎 1'))
  assert.ok(!html.includes('private-test-only'))
})
