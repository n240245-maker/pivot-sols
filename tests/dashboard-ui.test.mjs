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
test('P1 and E1 dashboards use different resource destinations', () => {
  const {DashboardContent} = loadTypeScript('src/pages/DashboardPage.tsx',authMocks)
  const html = render(createElement(DashboardContent,{profile:fixture}))
  assert.match(html,/Layout/)
  assert.match(html,/N260000/)
  assert.match(html,/P1/)
  assert.match(html,/RGUKT Nuzvid/)
  assert.match(html,/Your Pivot/)
  assert.equal((html.match(/class="pivot-resource-card /g)??[]).length,6)
  for (const path of ['/resources/books','/resources/labs','/campus/rooms','/faculty','/problems','/explore']) assert.ok(html.includes(`href="${path}"`),path)
  assert.ok(!html.includes('Career Domains')&&!html.includes('Career Jobs'))
  assert.ok(!html.includes('<video'))
  const updated = render(createElement(DashboardContent,{profile:{...fixture,name:'Another Student',studentId:'N240123',batch:24,academicLevel:'E1'}}))
  assert.match(updated,/Another/); assert.match(updated,/N240123/); assert.match(updated,/E1/)
  assert.ok(!updated.includes('N260000'))
  for(const path of ['/careers/domains','/careers/jobs','/problems'])assert.ok(updated.includes(`href="${path}"`))
  assert.ok(!updated.includes('Lab Videos')&&!updated.includes('href="/resources/labs"'))
  assert.ok(!updated.includes('I3 Block Rooms')&&!updated.includes('Faculty Directory'))
})
test('mobile navigation follows academic level and keeps active state', () => {
  const {MobileBottomNav} = loadTypeScript('src/components/dashboard/MobileBottomNav.tsx')
  const p1=render(createElement(MobileBottomNav,{level:'P1'}),'/faculty')
  for (const label of ['Rooms','Faculty','Problems','About','Contact','Profile']) assert.ok(p1.includes(`>${label}</span>`))
  assert.ok(p1.includes('href="/resources/labs"')&&p1.includes('>Labs</span>'))
  assert.ok(!p1.includes('Career Domains')&&!p1.includes('Career Jobs'))
  const html=render(createElement(MobileBottomNav,{level:'E1'}),'/branches')
  assert.ok(html.includes('Domains')&&html.includes('Jobs')&&html.includes('Problems'))
  assert.ok(!html.includes('href="/resources/labs"')&&!html.includes('>Labs</span>'))
  assert.match(html,/aria-current="page"[^>]*href="\/branches"/)
  const detail=render(createElement(MobileBottomNav,{level:'E1'}),'/branches/ece')
  assert.match(detail,/aria-current="page"[^>]*href="\/branches"/)
})
test('resource registries never offer P1 career destinations', () => {
  const p1=navigation.resourcesForLevel('P1')
  const e1=navigation.resourcesForLevel('E1')
  assert.ok(p1.some(item=>item.path==='/campus/rooms')&&p1.some(item=>item.path==='/faculty'))
  assert.ok(!p1.some(item=>item.path.startsWith('/careers/')))
  assert.ok(e1.some(item=>item.path==='/careers/domains')&&e1.some(item=>item.path==='/careers/jobs'))
  assert.ok(p1.some(item=>item.path==='/resources/labs'))
  assert.ok(!e1.some(item=>item.path==='/resources/labs'))
  assert.ok(p1.some(item=>item.path==='/problems')&&e1.some(item=>item.path==='/problems'))
})
test('P1 desktop sidebar includes campus links and excludes career links',()=>{
  const {DesktopSidebar}=loadTypeScript('src/components/dashboard/DesktopSidebar.tsx')
  const html=render(createElement(DesktopSidebar,{profile:fixture}))
  assert.ok(html.includes('I3 Block Rooms')&&html.includes('Faculty Directory')&&html.includes('Student Problems'))
  assert.ok(html.includes('href="/resources/labs"'))
  assert.ok(!html.includes('Career Domains')&&!html.includes('Career Jobs'))
  const e1=render(createElement(DesktopSidebar,{profile:{...fixture,academicLevel:'E1'}}))
  assert.ok(!e1.includes('Lab Videos')&&!e1.includes('href="/resources/labs"'))
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
    './pages/RoomsPage':{RoomsPage:stub}, './pages/FacultyPage':{FacultyPage:stub}, './pages/ProblemsPage':{ProblemsPage:stub}, './components/E1Route':{E1Route:stub}, './components/P1Route':{P1Route:stub},
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
