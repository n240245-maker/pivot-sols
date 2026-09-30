import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { loadTypeScript } from './load-typescript.mjs'
import {contentMocks} from './content-fixture.mjs'

const data = loadTypeScript('src/data/demoLabResources.ts').demoLabResources
const helpers = loadTypeScript('src/lib/labVideos.ts')
const media = loadTypeScript('src/lib/labVideoSource.ts')
const preferences = loadTypeScript('src/lib/branchPreference.ts')
const profile = { id:'lab-test-only', name:'Student', studentId:'N240001', academicLevel:'E1', batch:24, campus:'Nuzvid', email:'student@example.com' }
const root = '/resources/labs'
const semesterPath = `${root}/e1/ece/semester-1`
const labPath = `${semesterPath}/network-theory-lab`
const detailPath = `${labPath}/verification-of-thevenins-theorem`
const authMocks = { ...contentMocks, '../contexts/AuthContext':{useAuth:()=>({profile})} }
const render = (element, path = root) => renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:[path]},element))
function renderPage(path = root, level = 'E1', branch, catalog = data) {
  const { LabsContent } = loadTypeScript('src/pages/LabVideosPage.tsx', {
    ...authMocks,
    '../lib/branchPreference':{getSelectedBranch:()=>branch,setSelectedBranch:()=>true},
  })
  return render(createElement(LabsContent,{profile:{...profile,academicLevel:level},data:catalog}),path)
}

test('demo lab catalog is isolated from the empty confirmed production catalog', () => {
  const demo = loadTypeScript('src/config/labVideos.ts',{'./demo':{DEMO_MODE:true}}).labVideosCatalog
  const real = loadTypeScript('src/config/labVideos.ts',{'./demo':{DEMO_MODE:false}}).labVideosCatalog
  assert.equal(demo.demo,true); assert.equal(demo.labs.length,18)
  assert.equal(real.demo,false); assert.equal(real.labs.length,0)
  assert.equal(demo.labs.reduce((sum,lab)=>sum+lab.experiments.length,0),30)
  assert.ok(demo.labs.every(l=>l.experiments.every(e=>!e.videoUrl)))
  const shared = loadTypeScript('src/config/academicResources.ts')
  assert.equal(JSON.stringify(demo.curricula.filter(c=>c.branch).map(c=>c.branch)),JSON.stringify(shared.prototypeBranches))
  assert.ok(renderPage().includes('not the official RGUKT syllabus'))
})

test('P1 uses profile level, skips branch selection and has no fake branch URL', () => {
  const html = renderPage(root,'P1','ece')
  assert.ok(html.includes('Choose Semester'))
  assert.ok(!html.includes('Choose Your Branch')); assert.ok(!html.includes('Selected Branch'))
  for (const semester of ['semester-1','semester-2']) assert.ok(html.includes(`href="${root}/p1/${semester}"`))
  assert.ok(!html.includes('/common/'))
  const first = renderPage(`${root}/p1/semester-1`,'P1')
  for (const name of ['Physics Lab','Chemistry Lab','English Language Lab']) assert.ok(first.includes(name))
  const second = renderPage(`${root}/p1/semester-2`,'P1')
  for (const name of ['Physics Lab II','Programming Lab','Engineering Drawing / Workshop']) assert.ok(second.includes(name))
})

test('E1 first visit shows all six configured branches without asking for level', () => {
  const html = renderPage()
  assert.ok(html.includes('Choose Your Branch'))
  assert.equal((html.match(/class="books-selection-card"/g)??[]).length,6)
  for (const c of data.curricula.filter(c=>c.branch)) assert.ok(html.includes(`href="${root}/e1/${c.id}"`))
  assert.ok(!html.includes('<select')); assert.ok(!html.includes('Choose Academic Level'))
})

test('books and labs reuse the same editable E1 preference, including unavailable storage', () => {
  const values = new Map(), storage = {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}
  const books = loadTypeScript('src/data/demoAcademicResources.ts').demoAcademicResources
  assert.equal(preferences.setSelectedBranch(books,'ece',storage),true)
  assert.equal(preferences.getSelectedBranch(data,storage),'ece')
  assert.equal(preferences.setSelectedBranch(data,'cse',storage),true)
  assert.equal(preferences.getSelectedBranch(books,storage),'cse')
  assert.equal(values.get('pivot-sols-demo-branch'),'cse')
  assert.equal(preferences.setSelectedBranch(data,'common',storage),false)
  assert.equal(preferences.getSelectedBranch(data,{getItem:()=>{throw new Error('blocked')}}),undefined)
  const html = renderPage(root,'E1','ece')
  assert.ok(html.includes('Selected Branch')); assert.ok(html.includes('Choose Semester'))
  assert.ok(html.includes(`href="${root}?choose=branch"`))
  assert.ok(renderPage(`${root}?choose=branch`,'E1','ece').includes('Choose Your Branch'))
  assert.ok(renderPage(root,'E1','invalid').includes('Choose Your Branch'))
})

test('direct E1 branch navigation saves the chosen preference and offers both semesters', () => {
  const writes = []
  // Use an inert state setter while inspecting the preference effect.
  const component = loadTypeScript('src/pages/LabVideosPage.tsx',{
    ...authMocks, react:{useEffect:fn=>fn(),useState:initial=>[typeof initial==='function'?initial():initial,()=>{}]},
    '../lib/branchPreference':{getSelectedBranch:()=>undefined,setSelectedBranch:(_data,id)=>writes.push(id)},
  }).LabsContent
  const html=render(createElement(component,{profile,data}),`${root}/e1/ece`)
  assert.ok(writes.includes('ece'))
  for(const semester of ['semester-1','semester-2']) assert.ok(html.includes(`href="${root}/e1/ece/${semester}"`))
})

test('ECE and CSE labs match both supplied semester lists and show experiment counts', () => {
  const expected = [
    ['ece','semester-1',['Network Theory Lab','Electronic Devices Lab','C Programming Lab']],
    ['ece','semester-2',['Analog Electronics Lab','Digital Electronics Lab','Electrical Machines Lab']],
    ['cse','semester-1',['C Programming Lab','Data Structures Lab','Digital Logic Lab']],
    ['cse','semester-2',['OOP Lab','DBMS Lab','Algorithms Lab']],
  ]
  for(const [branch,semester,names] of expected) {
    assert.equal(JSON.stringify(helpers.getLabs(data,branch,semester).map(l=>l.name)),JSON.stringify(names))
    const html=renderPage(`${root}/e1/${branch}/${semester}`)
    assert.ok(html.includes('Choose a Lab'))
    for(const name of names) assert.ok(html.includes(name))
  }
  const html=renderPage(semesterPath)
  assert.ok(html.includes('6 experiments'));assert.ok(html.includes('5 experiments'))
})

test('unprepared branches and empty labs retain contextual navigation and honest states', () => {
  for(const branch of ['eee','mechanical','civil','chemical']) for(const semester of ['semester-1','semester-2']) {
    const html=renderPage(`${root}/e1/${branch}/${semester}`)
    assert.ok(html.includes('Lab resources for this branch are being prepared.'))
    assert.ok(html.includes('More experiments will be added soon.'))
    assert.ok(html.includes('Back to Semesters'))
  }
  assert.ok(renderPage(`${root}/e1/cse/semester-2/oop-lab`).includes('Experiments for this lab are being prepared.'))
  const withoutLabs={...data,labs:data.labs.filter(l=>!(l.curriculumId==='ece'&&l.semesterId==='semester-2'))}
  assert.ok(renderPage(`${root}/e1/ece/semester-2`,'E1',undefined,withoutLabs).includes('No labs have been added for this semester yet.'))
})

test('lab opens numbered experiment links and omits numbering when not configured', () => {
  const html=renderPage(labPath)
  assert.equal((html.match(/Watch &amp; Learn/g)??[]).length,6)
  assert.ok(html.includes(`href="${detailPath}"`));assert.ok(html.includes('>01</span>'))
  const route=helpers.resolveLabsRoute(data,'E1',labPath)
  const {ExperimentList}=loadTypeScript('src/components/resources/labs/LabLists.tsx')
  const noNumber={...route.lab.experiments[0],experimentNumber:undefined}
  const without=render(createElement(ExperimentList,{...route,experiments:[noNumber]}))
  assert.ok(!without.includes('labs-experiment-number'))
})

test('Thevenin detail renders configured sections, semantic lists, context and placeholder', () => {
  const html=renderPage(detailPath)
  for(const text of ['Verification of Thevenin&#x27;s Theorem','Network Theory Lab','E1','ECE','Semester 1','Video','Objective','Apparatus Required','Theory','Procedure','Expected Result','Precautions','Video coming soon','Experiment guide is available below.','Back to Experiments']) assert.ok(html.includes(text),text)
  assert.ok(html.includes('<ol class="labs-procedure">'));assert.ok(html.includes('DC supply'))
  assert.ok(!html.includes('<iframe'));assert.ok(!html.includes('<video'))
  const {ExperimentGuide}=loadTypeScript('src/components/resources/labs/ExperimentGuide.tsx')
  const sparse=render(createElement(ExperimentGuide,{experiment:{id:'sparse',slug:'sparse',title:'Sparse',apparatus:[],procedure:[],precautions:[]}}))
  for(const text of ['<h2>Objective','<h2>Theory','<h2>Apparatus Required','<h2>Procedure','<h2>Expected Result','<h2>Precautions']) assert.ok(!sparse.includes(text))
})

test('every lab and experiment URL resolves, with P1 branch-free breadcrumbs and named titles', () => {
  for(const lab of data.labs) {
    const curriculum=data.curricula.find(c=>c.id===lab.curriculumId),semester=curriculum.semesters.find(s=>s.id===lab.semesterId)
    for(const experiment of [undefined,...lab.experiments]) {
      const path=helpers.labsPath(curriculum,semester,lab,experiment)
      const resolved=helpers.resolveLabsRoute(data,curriculum.level,path)
      assert.equal(resolved.lab.id,lab.id)
      assert.equal(resolved.experiment?.id,experiment?.id)
      assert.equal(helpers.getLabPageTitle(data,path),`${experiment?.title??lab.name} · Pivot Sols`)
    }
  }
  const route=helpers.resolveLabsRoute(data,'P1',`${root}/p1/semester-1/physics-lab/vernier-caliper-measurement`)
  assert.equal(JSON.stringify(helpers.getLabsBreadcrumbs(route).map(c=>c.label)),JSON.stringify(['Lab Videos','Semester 1','Physics Lab','Measurement with a Vernier Caliper']))
  assert.equal(helpers.getLabPageTitle(data,root),'Lab Videos · Pivot Sols')
})

test('invalid branch, semester, lab, experiment, depth and cross-level routes recover', () => {
  for(const path of [`${root}/e1/nope`,`${root}/e1/ece/semester-3`,`${semesterPath}/missing`,`${labPath}/missing`,`${detailPath}/extra`,`${root}/e1`,`${root}/p1/common/semester-1`,`${root}/p1/semester-1`,`${root}/e1/ece//semester-1`,`${root}/e1/%3Cscript%3E`]) {
    assert.equal(helpers.resolveLabsRoute(data,'E1',path).valid,false,path)
    const html=renderPage(path)
    assert.ok(html.includes('Lab resource not found'));assert.ok(html.includes('Back to Lab Videos'))
  }
  assert.equal(helpers.resolveLabsRoute(data,'P1',detailPath).valid,false)
  assert.equal(helpers.resolveLabsRoute(data,'E1',`${detailPath}/`).valid,true)
})

test('search matches lab and experiment names and respects level, branch, semester and lab', () => {
  const scope=helpers.resolveLabsRoute(data,'E1',semesterPath)
  assert.equal(helpers.searchLabResources(data,'E1',' NETWORK ',scope)[0].lab.name,'Network Theory Lab')
  const match=helpers.searchLabResources(data,'E1','norton',scope)
  assert.equal(match.length,1);assert.equal(match[0].experiments.length,1);assert.equal(match[0].experiments[0].id,'norton')
  assert.equal(helpers.searchLabResources(data,'P1','norton').length,0)
  assert.equal(helpers.searchLabResources(data,'E1','norton',helpers.resolveLabsRoute(data,'E1',`${root}/e1/cse`)).length,0)
  assert.equal(helpers.searchLabResources(data,'E1','network',helpers.resolveLabsRoute(data,'E1',`${root}/e1/ece/semester-2`)).length,0)
  assert.equal(helpers.searchLabResources(data,'E1','input',helpers.resolveLabsRoute(data,'E1',labPath)).length,0)
  assert.equal(helpers.searchLabResources(data,'E1',' ').length,0)
  const {LabSearchResults}=loadTypeScript('src/pages/LabVideosPage.tsx',authMocks)
  const html=render(createElement(LabSearchResults,{data,level:'E1',query:'norton',scope}))
  assert.ok(html.includes(`${labPath}/verification-of-nortons-theorem`));assert.ok(!html.includes('Verification of Thevenin'))
  assert.ok(render(createElement(LabSearchResults,{data,level:'E1',query:'absentterm',scope})).includes('No matching labs or experiments found.'))
})

test('video URL validation accepts supported sources and rejects executable or lookalike URLs', () => {
  const id='AbCdEfG_123'
  for(const url of [`https://www.youtube.com/watch?v=${id}&list=ignore`,`https://youtu.be/${id}`,`https://www.youtube.com/shorts/${id}`,`https://www.youtube-nocookie.com/embed/${id}`]) assert.equal(media.getLabVideoSource({videoUrl:url,videoType:'youtube'}).id,id)
  for(const url of ['javascript:alert(1)','data:text/html,test','//evil.example/video.mp4','https://user:pass@example.com/video.mp4','https://example.com\\@youtube.com/watch?v=AbCdEfG_123','https://youtube.com.evil.example/watch?v=AbCdEfG_123','https://youtube.com/watch?v=short','https://youtube.com/watch?v=AbCdEfG_123<script>','http://youtube.com/watch?v=AbCdEfG_123','https://youtube.com:444/watch?v=AbCdEfG_123']) assert.equal(media.getLabVideoSource({videoUrl:url,videoType:'youtube'}),undefined,url)
  assert.equal(media.getLabVideoSource({videoUrl:'/videos/lab.mp4',videoType:'mp4'}).type,'mp4')
  assert.equal(media.getLabVideoSource({videoUrl:'https://media.example.edu/lab.mp4?token=sample',videoType:'mp4'}).type,'mp4')
  assert.equal(media.getLabVideoSource({videoUrl:'https://media.example.edu/watch',videoType:'external'}).type,'external')
  assert.equal(media.getLabVideoSource({videoUrl:'https://media.example.edu/watch',videoType:'mp4'}),undefined)
  assert.equal(media.getLabVideoSource({videoUrl:'/local',videoType:'external'}),undefined)
})

test('video renderer supports MP4, external, missing and invalid sources without autoplay', () => {
  const {LabVideo}=loadTypeScript('src/components/resources/labs/LabVideo.tsx')
  const experiment={id:'video-test',slug:'video-test',title:'A real title'}
  const output=extra=>render(createElement(LabVideo,{experiment:{...experiment,...extra}}))
  const mp4=output({videoUrl:'/approved/test.mp4',videoType:'mp4'})
  for(const text of ['<video','controls=""','playsInline=""','preload="none"','aria-label="Video: A real title"']) assert.ok(mp4.includes(text),text)
  assert.ok(!mp4.includes('autoPlay'));assert.ok(!mp4.includes('download='))
  const external=output({videoUrl:'https://approved.example.edu/watch',videoType:'external'})
  assert.ok(external.includes('rel="noopener noreferrer"'));assert.ok(!external.includes('<iframe'))
  assert.ok(output({}).includes('Video coming soon'))
  const invalid=output({videoUrl:'javascript:alert(1)',videoType:'youtube'})
  assert.ok(invalid.includes('Video unavailable'));assert.ok(!invalid.includes('javascript:'))
})

test('YouTube loads only after consent, embeds a validated ID, and offers fallback on failure', () => {
  const values=[],setters=[]
  let cursor=0
  const {LabVideo}=loadTypeScript('src/components/resources/labs/LabVideo.tsx',{
    react:{useState:initial=>{const i=cursor++;if(!(i in values))values[i]=initial;setters[i]=v=>values[i]=v;return [values[i],setters[i]]}},
  })
  const experiment={id:'test',title:'Network demonstration',slug:'test',videoType:'youtube',videoUrl:'https://youtu.be/AbCdEfG_123'}
  const wrapped=LabVideo({experiment})
  const draw=()=>{cursor=0;return wrapped.type(wrapped.props)}
  let tree=draw()
  let html=render(tree)
  assert.ok(html.includes('Load video'));assert.ok(!html.includes('<iframe'));assert.ok(!html.includes('src='))
  const button=tree.props.children.find(child=>child?.type==='button')
  button.props.onClick()
  tree=draw();html=render(tree)
  assert.ok(html.includes('https://www.youtube-nocookie.com/embed/AbCdEfG_123?autoplay=0&amp;rel=0'))
  assert.ok(html.includes('title="Video: Network demonstration"'));assert.ok(html.includes('watch on YouTube'))
  const iframe=tree.props.children[0].props.children
  iframe.props.onError();html=render(draw())
  assert.ok(html.includes('Video unavailable'));assert.ok(html.includes('Open video source'));assert.ok(!html.includes('<iframe'))
})

test('MP4 media failures render a clear recoverable fallback',()=>{
  const values=[];let cursor=0
  const {LabVideo}=loadTypeScript('src/components/resources/labs/LabVideo.tsx',{react:{useState:initial=>{const i=cursor++;if(!(i in values))values[i]=initial;return [values[i],v=>values[i]=v]}}})
  const wrapped=LabVideo({experiment:{id:'mp4',title:'Measurement',slug:'mp4',videoType:'mp4',videoUrl:'/video.mp4'}})
  const draw=()=>{cursor=0;return wrapped.type(wrapped.props)}
  draw().props.children.props.onError()
  const html=render(draw());assert.ok(html.includes('Video unavailable'));assert.ok(!html.includes('<video'))
})

test('P1 Lab Videos target remains available while E1 navigation omits it', () => {
  const {DashboardContent}=loadTypeScript('src/pages/DashboardPage.tsx',authMocks)
  const p1Profile={...profile,academicLevel:'P1',studentId:'N260001'}
  assert.ok(render(createElement(DashboardContent,{profile:p1Profile})).includes('href="/resources/labs"'))
  const {MobileBottomNav}=loadTypeScript('src/components/dashboard/MobileBottomNav.tsx')
  const p1=render(createElement(MobileBottomNav,{level:'P1'}),detailPath)
  const e1=render(createElement(MobileBottomNav,{level:'E1'}),detailPath)
  assert.ok(p1.includes('href="/resources/labs"'))
  assert.ok(!e1.includes('href="/resources/labs"'))
  for(const path of ['/dashboard','/branches','/about','/contact','/profile','/problems']) assert.ok(e1.includes(`href="${path}"`))
  const nav=loadTypeScript('src/config/studentNavigation.ts')
  assert.equal(nav.getStudentPageTitle(detailPath),'Lab Videos')
  const source=readFileSync('src/App.tsx','utf8')
  assert.ok(source.includes('<Route element={<P1Route />}>'))
  assert.ok(source.includes('<Route path="/resources/labs/*" element={<LabVideosPage />} />'))
})

test('P1 route opens Lab Videos and E1 direct root or experiment route redirects',()=>{
  for(const level of ['P1','E1']) {
    const {P1Route}=loadTypeScript('src/components/P1Route.tsx',{
      '../contexts/AuthContext':{useAuth:()=>({profile:{academicLevel:level}})},
    })
    const result=P1Route()
    if(level==='P1')assert.equal(result.type.name,'Outlet')
    else {
      assert.equal(result.props.to,'/dashboard')
      assert.equal(result.props.replace,true)
    }
  }
  const source=readFileSync('src/App.tsx','utf8')
  const guarded=source.slice(source.indexOf('<Route element={<P1Route />}>'),source.indexOf('</Route>',source.indexOf('<Route element={<P1Route />}>')))
  assert.ok(guarded.includes('<Route path="/resources/labs"'))
  assert.ok(guarded.includes('<Route path="/resources/labs/*"'))
})

test('E1 direct Lab Videos URL does not expose a lab page title while redirecting',()=>{
  for(const level of ['P1','E1']) {
    const document={title:''}
    const {RouteEffects}=loadTypeScript('src/components/common/RouteEffects.tsx',{
      ...contentMocks,
      react:{useEffect:callback=>callback()},
      'react-router':{useLocation:()=>({pathname:detailPath})},
      '../../contexts/AuthContext':{useAuth:()=>({profile:{academicLevel:level}})},
    },new Map(),{document,window:{scrollTo:()=>{}}})
    RouteEffects()
    assert.equal(document.title,level==='E1'?'Dashboard · Pivot Sols':"Verification of Thevenin's Theorem · Pivot Sols")
  }
})
