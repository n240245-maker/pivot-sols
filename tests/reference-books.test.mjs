import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { readFileSync } from 'node:fs'
import { loadTypeScript } from './load-typescript.mjs'

const demo = loadTypeScript('src/data/academics/demoReferenceBooks.ts').demoReferenceBooks
const production = loadTypeScript('src/config/referenceBooks.ts', { './demo': { DEMO_MODE: false } })
const helpers = loadTypeScript('src/lib/referenceBooks.ts')
const preferences = loadTypeScript('src/lib/branchPreference.ts')
const profile = { id:'books-test-only', name:'Test Student', studentId:'N260000', academicLevel:'P1', batch:26, campus:'Nuzvid', email:'test@rguktn.ac.in' }
const { BooksContent } = loadTypeScript('src/pages/ReferenceBooksPage.tsx', { '../contexts/AuthContext': {useAuth:()=>({profile})} })
function renderPage(level = 'P1', path = '/resources/books', data = demo) {
  return renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:[path]},createElement(BooksContent,{profile:{...profile,academicLevel:level},data})))
}

test('P1 books home bypasses branches and uses supplied profile academic level', () => {
  const html = renderPage()
  assert.ok(html.includes('Choose Semester'))
  assert.ok(!html.includes('Choose Your Branch'))
  assert.ok(html.includes('N260000'))
  assert.ok(html.includes('Academic level P1'))
  assert.ok(html.includes('/resources/books/p1/common/sample-1'))
})
test('E1 books home shows configured branches without deriving level from ID', () => {
  const html = renderPage('E1') // Deliberately retains P1-format fixture ID: profile level is the only source.
  assert.ok(html.includes('Choose Your Branch'))
  assert.ok(html.includes('Sample Engineering Branch'))
  assert.ok(html.includes('/resources/books/e1/sample-engineering'))
  assert.ok(!html.includes('Choose Semester'))
})
test('branch preference survives storage round trips and rejects removed or unknown choices', () => {
  const entries = new Map()
  const storage = {getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value)}
  assert.equal(preferences.getSelectedBranch(demo,storage),undefined)
  assert.equal(preferences.setSelectedBranch(demo,'sample-engineering',storage),true)
  assert.equal(preferences.getSelectedBranch(demo,storage),'sample-engineering')
  assert.equal(entries.size,1)
  assert.equal(preferences.setSelectedBranch(demo,'unknown',storage),false)
  assert.equal(preferences.getSelectedBranch(production.referenceBooksCatalog,storage),undefined)
  const denied = {getItem(){throw Error('denied')},setItem(){throw Error('denied')}}
  assert.doesNotThrow(()=>preferences.getSelectedBranch(demo,denied))
  assert.equal(preferences.setSelectedBranch(demo,'sample-engineering',denied),false)
})
test('semester and subject routes resolve within their exact curriculum and level', () => {
  const semester = helpers.resolveBooksRoute(demo,'E1','/resources/books/e1/sample-engineering/sample-1')
  assert.equal(semester.semester.name,'Sample Semester 1')
  assert.equal(helpers.getSubjects(demo,semester.curriculum.id,semester.semester.id).length,2)
  const html = renderPage('E1','/resources/books/e1/sample-engineering/sample-1')
  assert.ok(html.includes('Choose a Subject'))
  assert.ok(html.includes('/resources/books/e1/sample-engineering/sample-1/sample-subject'))
  assert.ok(html.includes('1 book'))
  const subject = helpers.resolveBooksRoute(demo,'E1','/resources/books/e1/sample-engineering/sample-1/sample-subject')
  assert.equal(subject.subject.id,'demo-e1-subject')
  assert.equal(helpers.findSubjectBySlug(demo,'common','sample-1','sample-subject').id,'demo-p1-subject')
})
test('configured book page renders metadata, missing resource status, and backward links', () => {
  const html = renderPage('P1','/resources/books/p1/common/sample-1/sample-subject')
  for(const text of ['Sample Reference Book','Sample Author','Sample edition','Resource coming soon','Back to subjects','Prototype resources']) assert.ok(html.includes(text),text)
  assert.ok(!html.includes('Open Resource'))
  assert.ok(!html.includes('<img'))
})
test('resource actions allow legitimate URLs and reject executable or malformed destinations', () => {
  const { BookCard } = loadTypeScript('src/components/resources/books/BookCard.tsx')
  const book = {...demo.books[0],resourceUrl:'https://example.com/library',sourceType:'library'}
  const html = renderToStaticMarkup(createElement(BookCard,{book}))
  assert.match(html,/href="https:\/\/example.com\/library" target="_blank" rel="noopener noreferrer"/)
  assert.ok(html.includes('opens in a new tab'))
  assert.ok(html.includes('Library source'))
  for(const url of ['javascript:alert(1)','data:text/html,test','//example.com','/\\example.com','https://user:secret@example.com',' https://example.com','https://example.com\n']) assert.equal(helpers.safeResourceUrl(url),undefined,url)
  assert.equal(helpers.safeResourceUrl('/resources/approved.pdf'),'/resources/approved.pdf')
  const invalid = renderToStaticMarkup(createElement(BookCard,{book:{...book,resourceUrl:'javascript:alert(1)'}}))
  assert.ok(invalid.includes('Resource coming soon'))
  assert.ok(!invalid.includes('href='))
})
test('invalid and cross-level paths show a recoverable not-found screen', () => {
  for(const path of ['/resources/books/fake/fake/fake','/resources/books/p1/common/missing','/resources/books/p1/common/sample-1/missing','/resources/books/p1/common/sample-1/sample-subject/extra','/resources/books/e1/sample-engineering','/resources/books/p1','/resources/books/p1/common/%3Cscript%3E']) {
    assert.equal(helpers.resolveBooksRoute(demo,'P1',path).valid,false,path)
    assert.ok(renderPage('P1',path).includes('Resource not found'),path)
  }
})
test('local search matches subject names, titles and authors and respects level/route scope', () => {
  for(const query of ['sample subject','reference book','SAMPLE AUTHOR']) {
    const result = helpers.searchResources(demo,'P1',query)
    assert.equal(result.length,1)
    assert.equal(result[0].subject.id,'demo-p1-subject')
  }
  assert.equal(helpers.searchResources(demo,'P1','nothing-here').length,0)
  const emptyScope = helpers.resolveBooksRoute(demo,'P1','/resources/books/p1/common/sample-2')
  assert.equal(helpers.searchResources(demo,'P1','sample',emptyScope).length,0)
  const { BooksSearchResults } = loadTypeScript('src/components/resources/books/BooksSearchResults.tsx')
  const html = renderToStaticMarkup(createElement(MemoryRouter,null,createElement(BooksSearchResults,{data:demo,level:'P1',query:'unmatched',scope:{valid:true}})))
  assert.ok(html.includes('No matching resources found.'))
})
test('production configuration excludes all demo content and shows truthful empty states', () => {
  assert.equal(production.ENABLE_DEMO_REFERENCE_DATA,false)
  assert.equal(production.referenceBooksCatalog.demo,false)
  assert.equal(production.referenceBooksCatalog.books.length,0)
  assert.equal(production.referenceBooksCatalog.subjects.length,0)
  const p1 = renderPage('P1','/resources/books',production.referenceBooksCatalog)
  const e1 = renderPage('E1','/resources/books',production.referenceBooksCatalog)
  assert.ok(p1.includes('Semesters haven'))
  assert.ok(e1.includes('Branch resources haven'))
  for(const html of [p1,e1]) { assert.ok(!html.includes('Sample')); assert.ok(!html.includes('Prototype resources')) }
})
test('breadcrumbs follow level, branch, semester and subject with correct parent links', () => {
  const route = helpers.resolveBooksRoute(demo,'E1','/resources/books/e1/sample-engineering/sample-1/sample-subject')
  const crumbs = helpers.getBooksBreadcrumbs(route,'E1')
  assert.equal(JSON.stringify(crumbs.map(c=>c.label)),JSON.stringify(['Reference Books','E1','DEMO','Sample Semester 1','Sample Subject']))
  assert.equal(crumbs[2].to,'/resources/books/e1/sample-engineering')
  assert.equal(crumbs[3].to,'/resources/books/e1/sample-engineering/sample-1')
  assert.equal(crumbs[4].to,undefined)
  assert.match(renderPage('E1','/resources/books/e1/sample-engineering/sample-1/sample-subject'),/<nav aria-label="Breadcrumb"/)
})
test('configured empty semester and empty subject remain useful', () => {
  assert.ok(renderPage('P1').includes('Resources for this semester haven'))
  assert.ok(renderPage('P1','/resources/books/p1/common/sample-2').includes('Subjects for this semester haven'))
  assert.ok(renderPage('E1','/resources/books/e1/sample-engineering/sample-1/sample-empty-subject').includes('No reference books have been added for this subject yet.'))
})
test('nested books route remains inside the existing protected student shell', () => {
  const source = readFileSync('src/App.tsx','utf8')
  const protectedStart = source.indexOf('<Route element={<ProtectedRoute />}>')
  const shellStart = source.indexOf('<Route element={<StudentShell />}>',protectedStart)
  const route = source.indexOf('<Route path="/resources/books/*"',shellStart)
  assert.ok(route > shellStart && route < source.indexOf('</Route>',shellStart))
  assert.ok(source.includes('path="/resources/books" element={<ReferenceBooksPage />}'))
})
