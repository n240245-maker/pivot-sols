import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { loadTypeScript } from './load-typescript.mjs'
import {contentMocks} from './content-fixture.mjs'

const display = loadTypeScript('src/lib/studentDisplay.ts')
test('local greeting handles all transition hours including after midnight', () => {
  for (const [hour, minute, expected] of [[0,0,'Good evening'],[4,59,'Good evening'],[5,0,'Good morning'],[11,59,'Good morning'],[12,0,'Good afternoon'],[16,59,'Good afternoon'],[17,0,'Good evening'],[23,59,'Good evening']]) {
    assert.equal(display.getGreeting(new Date(2026,8,14,hour,minute)),expected)
  }
})
test('display names and initials use supplied names and normalize whitespace', () => {
  assert.equal(display.getDisplayName('  Layout   Test  '),'Layout')
  assert.equal(display.getInitials(' Layout Test '),'LT')
  assert.equal(display.getInitials('Student'),'S')
  assert.equal(display.getInitials('Élodie Test'),'ÉT')
  assert.equal(display.getInitials(' '),'S')
})

// Isolated component fixture, never stored as an application user or session.
const fixture = {id:'component-test-only',name:'Layout Test',studentId:'N260000',batch:26,academicLevel:'P1',campus:'Nuzvid',email:'layout-test@rguktn.ac.in'}
const navigation = loadTypeScript('src/config/studentNavigation.ts')
const authMocks = { ...contentMocks, '../contexts/AuthContext': {useAuth:()=>({profile:fixture})}, '../../contexts/AuthContext': {useAuth:()=>({profile:fixture})} }
function render(element,path='/dashboard') {
  return renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:[path]},element))
}
test('dashboard uses profile values and exactly the five required resource destinations', () => {
  const {DashboardContent} = loadTypeScript('src/pages/DashboardPage.tsx',authMocks)
  const html = render(createElement(DashboardContent,{profile:fixture}))
  assert.match(html,/Layout/)
  assert.match(html,/N260000/)
  assert.match(html,/P1/)
  assert.match(html,/RGUKT Nuzvid/)
  assert.match(html,/Your Pivot/)
  assert.equal((html.match(/class="pivot-resource-card /g)??[]).length,5)
  for (const path of ['/resources/books','/resources/labs','/careers/domains','/careers/jobs','/explore']) assert.ok(html.includes(`href="${path}"`),path)
  assert.ok(!html.includes('<video'))
  const updated = render(createElement(DashboardContent,{profile:{...fixture,name:'Another Student',studentId:'N240123',batch:24,academicLevel:'E1'}}))
  assert.match(updated,/Another/); assert.match(updated,/N240123/); assert.match(updated,/E1/)
  assert.ok(!updated.includes('N260000'))
})
test('mobile navigation contains exactly five working destinations with an active state', () => {
  const {MobileBottomNav} = loadTypeScript('src/components/dashboard/MobileBottomNav.tsx')
  const html = render(createElement(MobileBottomNav),'/branches')
  assert.equal((html.match(/<a /g)??[]).length,5)
  for (const label of ['Home','Branches','About','Contact','Profile']) assert.ok(html.includes(`>${label}</span>`))
  assert.match(html,/aria-current="page"[^>]*href="\/branches"/)
  const detail=render(createElement(MobileBottomNav),'/branches/ece')
  assert.match(detail,/aria-current="page"[^>]*href="\/branches"/)
})
test('all resource destinations expose working content and dashboard navigation', () => {
  const pages=['ReferenceBooksPage','LabVideosPage','CareerDomainsPage','CareerJobsPage','ExplorePage']
  for (const [index,resource] of navigation.resourceDestinations.entries()) {
    const Component=loadTypeScript(`src/pages/${pages[index]}.tsx`,authMocks)[pages[index]]
    const html = render(createElement(Component),resource.path)
    assert.ok(html.includes(resource.title)); assert.ok(!html.includes('Content coming in the next phase.'))
    assert.ok(html.includes('<a ')); assert.ok(html.includes('<h1'))
    assert.ok(html.includes('href="/dashboard"'))
  }
})
test('profile identity stays read-only while contact exposes a prefilled working form', () => {
  const {ProfileContent} = loadTypeScript('src/pages/ProfilePage.tsx',authMocks)
  const html = render(createElement(ProfileContent,{profile:fixture,logoutAction:createElement('button',null,'Log Out')}),'/profile')
  for(const value of [fixture.name,fixture.studentId,fixture.academicLevel,fixture.email,fixture.campus]) assert.ok(html.includes(value))
  assert.ok(!html.includes('<input')); assert.ok(!html.includes('<select'))
  const {ContactContent} = loadTypeScript('src/pages/ContactPage.tsx',authMocks)
  const contact = render(createElement(ContactContent,{profile:fixture}),'/contact')
  assert.match(contact,/<button[^>]*type="submit"[^>]*>Send message/)
  assert.ok(contact.includes(`value="${fixture.email}"`)); assert.ok(contact.includes(`value="${fixture.name}"`))
  assert.ok(contact.includes('minLength="10"'));assert.ok(!contact.includes('Coming soon'))
})
test('every student destination is nested under the unchanged protected route', () => {
  const stub=()=>null
  const protectedStub=()=>null
  const shellStub=()=>null
  const mocks={
    './pages/LandingPage':{LandingPage:stub}, './pages/SignupPage':{SignupPage:stub}, './pages/LoginPage':{LoginPage:stub},
    './pages/AuthCallbackPage':{AuthCallbackPage:stub}, './pages/CompleteProfilePage':{CompleteProfilePage:stub},
    './pages/DashboardPage':{DashboardPage:stub}, './pages/ProfilePage':{ProfilePage:stub}, './pages/NotFoundPage':{NotFoundPage:stub},
    './pages/BranchesPage':{BranchesPage:stub}, './pages/AboutPage':{AboutPage:stub}, './pages/ContactPage':{ContactPage:stub},
    './pages/CareerDomainsPage':{CareerDomainsPage:stub}, './pages/CareerJobsPage':{CareerJobsPage:stub}, './pages/ExplorePage':{ExplorePage:stub}, './components/common/RouteEffects':{RouteEffects:stub},
    './pages/ReferenceBooksPage':{ReferenceBooksPage:stub},
    './pages/LabVideosPage':{LabVideosPage:stub},
    './pages/DemoLoginPage':{DemoLoginPage:stub},
    './components/ProtectedRoute':{ProtectedRoute:protectedStub,GuestRoute:stub}, './components/common/StudentShell':{StudentShell:shellStub},
  }
  const App=loadTypeScript('src/App.tsx',mocks).default
  const all=[]
  const walk=(value,protectedRoute=false,shell=false)=>{
    if(Array.isArray(value)){value.forEach(v=>walk(v,protectedRoute,shell));return}
    if(!value?.props)return
    const guarded=protectedRoute||value.props.element?.type===protectedStub
    const shared=shell||value.props.element?.type===shellStub
    if(value.props.path)all.push({path:value.props.path,guarded,shared})
    walk(value.props.children,guarded,shared)
  }
  walk(App())
  for(const path of ['/dashboard','/profile','/branches','/about','/contact','/branches/:branchSlug','/careers/domains/:domainSlug','/careers/jobs/:roleSlug',...navigation.resourceDestinations.map(r=>r.path)]) {
    const route=all.find(r=>r.path===path)
    assert.ok(route?.guarded,`${path} must require authentication`)
    assert.ok(route?.shared,`${path} must use the persistent shell`)
  }
  assert.ok(all.some(r=>r.path==='*'))
})
