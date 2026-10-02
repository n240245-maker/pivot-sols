import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { loadTypeScript } from './load-typescript.mjs'

const data = loadTypeScript('src/data/demoAcademicResources.ts').demoAcademicResources
const helpers = loadTypeScript('src/lib/referenceBooks.ts')
const preferences = loadTypeScript('src/lib/branchPreference.ts')
const profile = {id:'prototype-test',name:'Harsha',studentId:'N240001',academicLevel:'E1',batch:0,campus:'Nuzvid',email:'demo@rguktn.ac.in'}
function renderPage(path='/resources/books',level='E1',branch) {
  const {BooksContent} = loadTypeScript('src/pages/ReferenceBooksPage.tsx',{
    '../contexts/AuthContext':{useAuth:()=>({profile})},
    '../lib/branchPreference':{getSelectedBranch:()=>branch,setSelectedBranch:()=>true},
  })
  return renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:[path]},createElement(BooksContent,{profile:{...profile,academicLevel:level},data})))
}
test('prototype catalog is selected in demo builds and isolated from real mode',()=>{
  const enabled=loadTypeScript('src/config/referenceBooks.ts',{'./demo':{DEMO_MODE:true}})
  const real=loadTypeScript('src/config/referenceBooks.ts',{'./demo':{DEMO_MODE:false}})
  assert.equal(enabled.referenceBooksCatalog.subjects.length,30)
  assert.equal(enabled.referenceBooksCatalog.books.length,31)
  assert.equal(real.referenceBooksCatalog.demo,false)
  assert.equal(real.referenceBooksCatalog.subjects.length,0)
  assert.equal(real.referenceBooksCatalog.books.length,0)
})
test('P1 prototype has both semesters directly and no branch in context or breadcrumbs',()=>{
  const home=renderPage('/resources/books','P1','ece')
  assert.ok(home.includes('Choose Semester'));assert.ok(!home.includes('Choose Your Branch'))
  for(const semester of ['semester-1','semester-2']) assert.ok(home.includes(`/resources/books/p1/common/${semester}`))
  const subjects=renderPage('/resources/books/p1/common/semester-1','P1')
  for(const name of ['Mathematics','Physics','Chemistry','English','Introduction to Computing']) assert.ok(subjects.includes(name))
  assert.ok(!subjects.includes('Common curriculum'));assert.ok(!subjects.includes('Selected Branch'))
  const route=helpers.resolveBooksRoute(data,'P1','/resources/books/p1/common/semester-1/physics')
  assert.equal(JSON.stringify(helpers.getBooksBreadcrumbs(route,'P1').map(c=>c.label)),JSON.stringify(['Reference Books','P1','Semester 1','Physics']))
})
test('E1 first visit exposes exactly the six supplied configurable branch options',()=>{
  const branches=helpers.getBranchesForLevel(data,'E1')
  assert.equal(branches.length,6)
  assert.equal(branches.map(b=>b.shortName).join(','),'CSE,ECE,EEE,ME,CE,CHE')
  const html=renderPage()
  assert.ok(html.includes('Choose Your Branch'))
  assert.equal((html.match(/class="books-selection-card"/g)??[]).length,6)
  for(const branch of branches) assert.ok(html.includes(`href="/resources/books/e1/${branch.id}"`))
})
test('E1 remembers a valid demo branch in its dedicated preference and allows changing it',()=>{
  const values=new Map()
  const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}
  assert.equal(preferences.setSelectedBranch(data,'ece',storage),true)
  assert.equal(values.get('pivot-sols-demo-branch'),'ece')
  assert.equal(preferences.getSelectedBranch(data,storage),'ece')
  assert.equal(preferences.setSelectedBranch(data,'unknown',storage),false)
  const remembered=renderPage('/resources/books','E1','ece')
  assert.ok(remembered.includes('Selected Branch'));assert.ok(remembered.includes('Choose Semester'))
  assert.ok(remembered.includes('href="/resources/books?choose=branch"'))
  const changing=renderPage('/resources/books?choose=branch','E1','ece')
  assert.ok(changing.includes('Choose Your Branch'));assert.ok(!changing.includes('Choose Semester'))
})
test('ECE subjects in both semesters match the requested presentation content',()=>{
  for(const [semester,names] of [
    ['semester-1',['Network Theory','Electronic Devices','Engineering Mathematics','Electromagnetic Theory','C Programming']],
    ['semester-2',['Analog Electronics','Digital Electronics','Signals and Systems','Electrical Machines','Probability & Random Processes']],
  ]) {
    assert.equal(JSON.stringify(helpers.getSubjects(data,'ece',semester).map(s=>s.name)),JSON.stringify(names))
    const html=renderPage(`/resources/books/e1/ece/${semester}`)
    assert.ok(html.includes('Choose a Subject'))
    assert.ok(html.includes('Prototype resources'))
  }
})
test('CSE semester navigation includes both complete supplied subject lists',()=>{
  const first=helpers.getSubjects(data,'cse','semester-1').map(s=>s.name)
  const second=helpers.getSubjects(data,'cse','semester-2').map(s=>s.name)
  assert.equal(JSON.stringify(first),JSON.stringify(['C Programming','Data Structures','Digital Logic','Discrete Mathematics','Computer Organization']))
  assert.equal(JSON.stringify(second),JSON.stringify(['Algorithms','Object Oriented Programming','Database Management Systems','Operating Systems','Probability & Statistics']))
  for(const semester of data.curricula.find(c=>c.id==='cse').semesters) {
    assert.ok(renderPage('/resources/books/e1/cse').includes(`href="/resources/books/e1/cse/${semester.id}"`))
  }
})
test('other prototype branches have semester navigation and honest preparation states',()=>{
  for(const branch of ['eee','mechanical','civil','chemical']) {
    assert.ok(renderPage(`/resources/books/e1/${branch}`).includes('Choose Semester'))
    for(const semester of ['semester-1','semester-2']) {
      const html=renderPage(`/resources/books/e1/${branch}/${semester}`)
      assert.ok(html.includes('Resources for this branch are being prepared.'))
      assert.ok(html.includes('More subjects will be added soon.'))
    }
    assert.equal(data.subjects.filter(s=>s.curriculumId===branch).length,0)
  }
})
test('Network Theory resolves its supplied books and local details actions',()=>{
  const path='/resources/books/e1/ece/semester-1/network-theory'
  const route=helpers.resolveBooksRoute(data,'E1',path)
  const books=helpers.getBooks(data,route.subject.id)
  assert.equal(books.map(b=>b.title).join('|'),'Engineering Circuit Analysis|Network Analysis')
  const html=renderPage(path)
  for(const text of ['Engineering Circuit Analysis','William H. Hayt','Network Analysis','M. E. Van Valkenburg','View Details']) assert.ok(html.includes(text))
  assert.equal((html.match(/aria-haspopup="dialog"/g)??[]).length,2)
  assert.ok(!html.includes('target="_blank"'));assert.ok(!html.includes('<img'))
})
test('prototype book details include exact subject, authors and availability without a download',()=>{
  const {BookDetailsModal}=loadTypeScript('src/components/resources/books/BookDetailsModal.tsx')
  const book=data.books.find(b=>b.title==='Engineering Circuit Analysis')
  const html=renderToStaticMarkup(createElement(BookDetailsModal,{book,subjectName:'Network Theory',onClose:()=>{}}))
  for(const text of ['Engineering Circuit Analysis','William H. Hayt','Reference Book','Network Theory','Availability','Resource link will be added in the full version of Pivot Sols.','Close']) assert.ok(html.includes(text))
  assert.ok(html.includes('<dialog'));assert.ok(html.includes('aria-labelledby='))
  assert.ok(!html.includes('href='));assert.ok(!html.includes('<img'))
  assert.ok(data.books.every(b=>!b.resourceUrl&&!b.coverUrl))
})
test('prototype search filters by subject, title and author within the current selection',()=>{
  const scope=helpers.resolveBooksRoute(data,'E1','/resources/books/e1/ece/semester-1')
  const network=helpers.searchResources(data,'E1','Network',scope)
  assert.equal(network.length,1);assert.equal(network[0].subject.name,'Network Theory')
  const author=helpers.searchResources(data,'E1','valkenburg',scope)
  assert.equal(author.length,1);assert.equal(author[0].books.length,1);assert.equal(author[0].books[0].title,'Network Analysis')
  assert.equal(helpers.searchResources(data,'E1','impossible-match',scope).length,0)
  assert.equal(helpers.searchResources(data,'P1','network').length,0)
})
test('all prototype subject paths resolve and invalid or cross-level resource paths recover',()=>{
  for(const subject of data.subjects) {
    const curriculum=data.curricula.find(c=>c.id===subject.curriculumId)
    const semester=curriculum.semesters.find(s=>s.id===subject.semesterId)
    const resolved=helpers.resolveBooksRoute(data,curriculum.level,helpers.booksPath(curriculum,semester,subject))
    assert.equal(resolved.subject.id,subject.id)
  }
  for(const path of ['/resources/books/fake/fake/fake','/resources/books/e1/ece/semester-3','/resources/books/e1/ece/semester-1/invalid','/resources/books/p1/common/semester-1/physics']) assert.ok(renderPage(path).includes('Resource not found'))
})
test('student profile academic level feeds books and dashboard navigation without ID parsing',()=>{
  const p1={name:'Student',studentId:'N260001',academicLevel:'P1'}
  assert.equal(helpers.getCurriculaForLevel(data,p1.academicLevel)[0].id,'common')
  const e1={name:'Harsha',studentId:'N240001',academicLevel:'E1'}
  assert.equal(helpers.getBranchesForLevel(data,e1.academicLevel).length,6)
  const navigation=loadTypeScript('src/config/studentNavigation.ts')
  assert.equal(navigation.resourceDestinations.find(d=>d.title==='Reference Books').path,'/resources/books')
  assert.ok(navigation.resourcesForLevel('P1').some(d=>d.title==='Faculty Directory'))
  assert.ok(navigation.resourcesForLevel('E1').some(d=>d.title==='Career Jobs'))
})
