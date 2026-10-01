import assert from 'node:assert/strict'
import test from 'node:test'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter,Route,Routes} from 'react-router'
import {loadTypeScript} from './load-typescript.mjs'
import {contentFixture,contentMocks} from './content-fixture.mjs'

const domains=loadTypeScript('src/data/careers/domains.ts').careerDomains
const roles=loadTypeScript('src/data/careers/roles.ts').careerRoles
const branches=loadTypeScript('src/data/branches/branches.ts').branchGuides
const careerHelpers=loadTypeScript('src/lib/careers.ts')
const helpers={...careerHelpers,findDomain:slug=>careerHelpers.findDomain(slug,domains),findRole:id=>careerHelpers.findRole(id,roles),filterDomains:(q,c)=>careerHelpers.filterDomains(q,c,domains,roles),filterRoles:(q,c)=>careerHelpers.filterRoles(q,c,domains,roles)}
const searchHelpers=loadTypeScript('src/lib/localSearch.ts')
const search={...searchHelpers,buildLocalSearchIndex:level=>searchHelpers.buildLocalSearchIndex(level,contentFixture.books,contentFixture.labs,domains,roles,branches)}
const profile={id:'test-only',name:'Test Student',studentId:'N240001',email:'student@example.com',academicLevel:'E1',campus:'Nuzvid',batch:24}
const mocks={...contentMocks,'../contexts/AuthContext':{useAuth:()=>({profile})}}
function render(element,path='/') {return renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:[path]},element))}
function page(name,path,pattern,level='E1') {
  const module=loadTypeScript(`src/pages/${name}.tsx`,{...contentMocks,'../contexts/AuthContext':{useAuth:()=>({profile:{...profile,academicLevel:level}})}})
  return render(createElement(Routes,null,createElement(Route,{path:pattern,element:createElement(module[name])})),path)
}

test('all 16 domains and 24 roles have complete, linked prototype data',()=>{
  assert.equal(domains.length,16);assert.equal(roles.length,24)
  for(const list of [domains,roles,branches])assert.equal(new Set(list.map(i=>i.id)).size,list.length)
  for(const d of domains){
    assert.ok(d.overview&&d.work.length>=4&&d.work.length<=6&&d.skills.length>=3&&d.tools.length&&d.subjects.length)
    assert.ok(d.roadmap.length>=3&&d.roadmap.length<=4)
    assert.ok(d.roleIds.every(id=>roles.some(r=>r.id===id)))
    assert.ok(['Low','Moderate','High'].includes(d.programming)&&['Low','Moderate','High'].includes(d.mathematics))
  }
  for(const r of roles){
    assert.ok(domains.some(d=>d.slug===r.domainSlug));assert.ok(r.responsibilities.length>=4)
    assert.ok(r.skills.length&&r.subjects.length&&r.tools.length&&r.technologies.length&&r.interviewTopics.length)
    assert.ok(r.projects.length>=2&&r.projects.length<=4);assert.equal(r.roadmap.length,4)
    assert.ok(domains.some(d=>d.roleIds.includes(r.id)))
  }
})
test('domain search covers names, skills, tools, categories and canonical role names',()=>{
  for(const [query,slug] of [['VLSI','vlsi'],['CMOS','vlsi'],['GTKWave','vlsi'],['Hardware','vlsi'],['RTL Design Engineer','vlsi']])assert.ok(helpers.filterDomains(query).some(d=>d.slug===slug),query)
  assert.equal(helpers.filterDomains('','Security')[0].slug,'cybersecurity')
  assert.equal(helpers.filterDomains('vlsi','Software').length,0)
  assert.equal(helpers.filterDomains('no-such-content').length,0)
})
test('role search combines domain/category filtering with names, skills and tools',()=>{
  for(const query of ['RTL','VLSI','FSMs','Icarus'])assert.ok(helpers.filterRoles(query,'Hardware').some(r=>r.id==='rtl-design-engineer'))
  assert.equal(helpers.filterRoles('RTL','Software').length,0)
  assert.equal(helpers.filterRoles('no-such-content').length,0)
  assert.ok(helpers.filterRoles('','Infrastructure').every(r=>['cloud-engineer','devops-engineer'].includes(r.id)))
})
test('career lists render every card with accessible filters and usable links',()=>{
  const d=page('CareerDomainsPage','/careers/domains','/careers/domains')
  const r=page('CareerJobsPage','/careers/jobs','/careers/jobs')
  for(const item of domains)assert.ok(d.includes(`href="/careers/domains/${item.slug}"`))
  for(const item of roles)assert.ok(r.includes(`href="/careers/jobs/${item.slug}"`))
  assert.ok(d.includes('Search career domains...'));assert.ok(r.includes('Search career roles...'))
  assert.ok(d.includes('<fieldset'));assert.ok(d.includes('aria-pressed="true"'))
  assert.ok(r.includes('not live job vacancies'));assert.ok(!r.includes('salary'))
})
test('VLSI detail includes all sections, roadmap and canonical role links',()=>{
  const html=page('CareerDomainsPage','/careers/domains/vlsi','/careers/domains/:domainSlug')
  for(const title of ['Overview','What you&#x27;ll work on','Core Skills','Useful Subjects','Tools &amp; Technologies','Who may enjoy this?','Related Roles','Roadmap','Foundations','Projects &amp; Practice'])assert.ok(html.includes(title),title)
  for(const id of helpers.findDomain('vlsi').roleIds)assert.ok(html.includes(`/careers/jobs/${id}`))
  assert.ok(html.includes('aria-label="Breadcrumb"'));assert.ok(html.includes('aria-current="page"'))
})
test('all role detail routes render their data, domain link and project ideas',()=>{
  for(const role of roles){
    const html=page('CareerJobsPage',`/careers/jobs/${role.slug}`,'/careers/jobs/:roleSlug')
    for(const title of ['Typical Responsibilities','Skills Required','Useful Subjects','Technologies','Learning Roadmap','Interview Topics','Example Projects'])assert.ok(html.includes(title),role.id+title)
    assert.ok(html.includes(`href="/careers/domains/${role.domainSlug}"`));assert.ok(html.includes(role.name))
  }
})
test('unknown career slugs have contextual recovery links',()=>{
  for(const [name,path,pattern,text,root] of [['CareerDomainsPage','/careers/domains/unknown','/careers/domains/:domainSlug','Career domain not found','/careers/domains'],['CareerJobsPage','/careers/jobs/unknown','/careers/jobs/:roleSlug','Career role not found','/careers/jobs']]){
    const html=page(name,path,pattern);assert.ok(html.includes(text));assert.ok(html.includes(`href="${root}"`))
  }
})
test('branch guides reuse all six branch definitions and only reference existing careers',()=>{
  const config=loadTypeScript('src/config/academicResources.ts')
  assert.equal(branches.map(b=>b.id).join(','),config.prototypeBranches.map(b=>b.id).join(','))
  for(const b of branches){assert.ok(b.overview&&b.areas.length);assert.ok(b.domainSlugs.every(slug=>helpers.findDomain(slug)));assert.ok(b.roleIds.every(id=>helpers.findRole(id)))}
  const html=page('BranchesPage','/branches','/branches')
  for(const b of branches)assert.ok(html.includes(`href="/branches/${b.id}"`))
})
test('ECE branch links careers and level-appropriate academic resources',()=>{
  const e1=page('BranchesPage','/branches/ece','/branches/:branchSlug')
  for(const href of ['/careers/domains/vlsi','/careers/jobs/rtl-design-engineer','/resources/books/e1/ece','/resources/labs/e1/ece'])assert.ok(e1.includes(`href="${href}"`))
  const p1=page('BranchesPage','/branches/ece','/branches/:branchSlug','P1')
  assert.ok(p1.includes('href="/resources/books"'));assert.ok(p1.includes('href="/resources/labs"'));assert.ok(!p1.includes('/resources/labs/e1'))
  assert.ok(page('BranchesPage','/branches/unknown','/branches/:branchSlug').includes('Branch not found'))
})
test('shared search index covers every result type and scopes academic links to profile level',()=>{
  for(const level of ['P1','E1']){
    const index=search.buildLocalSearchIndex(level)
    assert.equal(new Set(index.map(r=>r.id)).size,index.length)
    for(const type of ['Book','Subject','Lab','Experiment','Career Domain','Career Role','Branch'])assert.ok(index.some(r=>r.type===type))
    for(const result of index.filter(r=>['Book','Subject','Lab','Experiment'].includes(r.type)))assert.ok(result.to.includes(`/${level.toLowerCase()}/`))
  }
  const index=search.buildLocalSearchIndex('E1')
  const network=search.searchLocalResources(index,'Network')
  assert.ok(network.some(r=>r.type==='Subject'&&r.title==='Network Theory'))
  assert.ok(network.some(r=>r.type==='Lab'&&r.title==='Network Theory Lab'))
  assert.ok(search.searchLocalResources(index,'Valkenburg').some(r=>r.type==='Book'))
  assert.ok(search.searchLocalResources(index,'thevenin').some(r=>r.type==='Experiment'))
  assert.equal(search.searchLocalResources(index,' VLSI ')[0].title,'VLSI')
  assert.equal(search.searchLocalResources(index,'  ').length,0)
  assert.equal(search.searchLocalResources(index,'unknown-no-result').length,0)
})
test('all academic search results resolve in the preserved Books and Labs route helpers',()=>{
  const books=loadTypeScript('src/config/referenceBooks.ts').referenceBooksCatalog
  const labs=loadTypeScript('src/config/labVideos.ts').labVideosCatalog
  const bookHelpers=loadTypeScript('src/lib/referenceBooks.ts')
  const labHelpers=loadTypeScript('src/lib/labVideos.ts')
  for(const level of ['P1','E1'])for(const r of search.buildLocalSearchIndex(level)){
    if(r.type==='Book'||r.type==='Subject')assert.equal(bookHelpers.resolveBooksRoute(books,level,r.to).valid,true,r.id)
    if(r.type==='Lab'||r.type==='Experiment')assert.equal(labHelpers.resolveLabsRoute(labs,level,r.to).valid,true,r.id)
  }
})
test('global search result links include type/context and call the navigation close action',()=>{
  const {LocalSearchResults}=loadTypeScript('src/components/resources/LocalSearchResults.tsx')
  const results=search.searchLocalResources(search.buildLocalSearchIndex('E1'),'RTL')
  const html=render(createElement(LocalSearchResults,{results,query:'RTL'}))
  assert.ok(html.includes('Career Role'));assert.ok(html.includes('/careers/jobs/rtl-design-engineer'))
  assert.ok(render(createElement(LocalSearchResults,{results:[],query:'none'})).includes('No matching Pivot Sols resources found.'))
  let closed=false
  const tree=LocalSearchResults({results,query:'RTL',onNavigate:()=>closed=true})
  const nodes=value=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(nodes):[value,...nodes(value.props?.children)]
  nodes(tree).find(n=>n.props?.to==='/careers/jobs/rtl-design-engineer').props.onClick()
  assert.equal(closed,true)
})
test('Explore has working academic, career and student-tool destinations',()=>{
  const html=page('ExplorePage','/explore','/explore')
  for(const text of ['Explore Pivot Sols','Academic','Careers','Student Tools','Quick Search','Branch Explorer','Resource Finder'])assert.ok(html.includes(text))
  for(const path of ['/resources/books','/resources/labs','/careers/domains','/careers/jobs','/branches','#quick-search','#resource-finder'])assert.ok(html.includes(`href="${path}"`))
})
test('resource finder changes its links when the student selects each intent',()=>{
  let choice='Academic'
  const {ResourceFinder}=loadTypeScript('src/pages/ExplorePage.tsx',{...mocks,react:{useState:()=>[choice,value=>choice=value],useMemo:fn=>fn()}})
  const nodes=value=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(nodes):[value,...nodes(value.props?.children)]
  for(const [label,expected] of [['Labs','/resources/labs'],['Careers','/careers/jobs'],['Academic','/resources/books']]){
    nodes(ResourceFinder()).find(n=>n.type==='button'&&n.props.children===label).props.onClick()
    const html=render(ResourceFinder());assert.ok(html.includes(`href="${expected}"`));assert.ok(html.includes('aria-pressed="true"'))
  }
})
test('domain and role filter controls update visible results and recover from no matches',()=>{
  for(const [file,placeholder,filter,expected,missing] of [['CareerDomainsPage','domain-search','Hardware','VLSI','No matching career domains found.'],['CareerJobsPage','role-search','Hardware','RTL Design Engineer','No matching career roles found.']]){
    let cursor=0;const slots=[]
    const module=loadTypeScript(`src/pages/${file}.tsx`,{...contentMocks,react:{useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],v=>slots[i]=v]}},'react-router':{Link:props=>createElement('a',{href:props.to},props.children),useParams:()=>({})}})
    const draw=()=>{cursor=0;return module[file]()}
    const nodes=v=>!v||typeof v!=='object'?[]:Array.isArray(v)?v.flatMap(nodes):[v,...nodes(v.props?.children)]
    nodes(draw()).find(n=>n.type?.name==='CategoryFilters').props.onChange(filter)
    assert.ok(render(draw()).includes(expected))
    nodes(draw()).find(n=>n.props?.id===placeholder).props.onChange('absent-value')
    assert.ok(render(draw()).includes(missing))
  }
})
test('nested page titles use names and reject unknown or overlong routes',()=>{
  const {discoveryTitle}=loadTypeScript('src/lib/discoveryTitles.ts')
  for(const [path,title] of [['/careers/domains/vlsi','VLSI'],['/careers/jobs/rtl-design-engineer','RTL Design Engineer'],['/branches/ece','ECE'],['/careers/domains/nope','Career domain not found'],['/careers/jobs/rtl-design-engineer/extra','Career role not found'],['/branches/ece/extra','Branch not found']])assert.equal(discoveryTitle(path,contentFixture),`${title} · Pivot Sols`)
})
