import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { loadTypeScript } from './load-typescript.mjs'

const demo = loadTypeScript('src/lib/demoSession.ts')
function memoryStorage() {
  const entries = new Map()
  return {entries,getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)}
}
const details = {name:'Harsha',studentId:'ABC123',year:'E1',email:'student@example.com'}
const verified = {success:true,verified:true}
test('prototype persists arbitrary nonempty details only with successful email verification',()=>{
  const storage=memoryStorage()
  const profile=demo.createDemoSession(details,verified,storage)
  assert.equal(profile.name,'Harsha');assert.equal(profile.studentId,'ABC123');assert.equal(profile.academicLevel,'E1')
  assert.equal(profile.email,'student@example.com');assert.equal(profile.campus,'Nuzvid')
  assert.equal(demo.getDemoSession(storage).studentId,'ABC123')
  const p1=demo.createDemoSession({name:' Pavan ',studentId:' anything at all ',year:'P1',email:' PAVAN@Example.com '},verified,storage)
  assert.equal(p1.name,'Pavan');assert.equal(p1.studentId,'anything at all');assert.equal(p1.academicLevel,'P1')
})
test('unverified results, the retired code and incomplete details do not create a session',()=>{
  const storage=memoryStorage()
  for(const result of ['123456',null,{success:true},{verified:true},{success:true,verified:false}]) assert.throws(()=>demo.createDemoSession(details,result,storage),/Verify your email/)
  for(const input of [{...details,name:' '},{...details,studentId:' '},{...details,year:'E2'},{...details,email:'invalid'}]) assert.throws(()=>demo.createDemoSession(input,verified,storage))
  assert.equal(storage.entries.size,0)
})
test('malformed, partial and stale demo sessions never restore',()=>{
  const storage=memoryStorage()
  assert.equal(demo.getDemoSession(storage),null)
  storage.setItem(demo.DEMO_SESSION_KEY,'active-v1')
  for(const value of ['bad-json','null','{}',JSON.stringify({...details,academicLevel:'E2'})]) { storage.setItem(demo.DEMO_PROFILE_KEY,value);assert.equal(demo.getDemoSession(storage),null) }
  demo.createDemoSession(details,verified,storage)
  storage.setItem(demo.DEMO_SESSION_KEY,'active-v1')
  assert.equal(demo.getDemoSession(storage),null)
  storage.removeItem(demo.DEMO_SESSION_KEY)
  assert.equal(demo.getDemoSession(storage),null)
})
test('logout removes both demo keys while retaining unrelated preferences',()=>{
  const storage=memoryStorage()
  storage.setItem('unrelated','keep')
  demo.createDemoSession(details,verified,storage)
  demo.clearDemoSession(storage)
  assert.equal(demo.getDemoSession(storage),null)
  assert.equal(storage.getItem(demo.DEMO_PROFILE_KEY),null)
  assert.equal(storage.getItem(demo.DEMO_SESSION_KEY),null)
  assert.equal(storage.getItem('unrelated'),'keep')
})
test('storage failures are recoverable and never grant a partial demo session',()=>{
  const denied={getItem(){throw Error('blocked')},setItem(){throw Error('quota')},removeItem(){}}
  assert.equal(demo.getDemoSession(denied),null)
  assert.throws(()=>demo.createDemoSession(details,verified,denied),/Could not save/)
})
test('demo guard admits local profiles without Supabase identities; production rejects them',()=>{
  const profile=demo.createDemoSession(details,verified,memoryStorage())
  const Navigate=()=>null,Outlet=()=>null
  for(const enabled of [true,false]) {
    for(const present of [true,false]) {
      const routes=loadTypeScript('src/components/ProtectedRoute.tsx',{
        'react-router':{Navigate,Outlet},'../config/demo':{DEMO_MODE:enabled},
        '../contexts/AuthContext':{useAuth:()=>({loading:false,session:null,user:null,profile:present?profile:null})},
        './auth/AccessProblem':{AccessProblem:()=>null},
      })
      assert.equal(routes.ProtectedRoute().type,enabled&&present?Outlet:Navigate)
      const guest=routes.GuestRoute()
      assert.equal(guest.type,enabled&&present?Navigate:Outlet)
      if(enabled&&present) assert.equal(guest.props.to,'/dashboard')
    }
  }
})
test('demo provider uses local session helpers and existing shared auth interface',async()=>{
  const changes=[],calls=[]
  const fixture=demo.createDemoSession(details,verified,memoryStorage())
  const {DemoAuthProvider}=loadTypeScript('src/contexts/DemoAuthContext.tsx',{
    react:{useState:initializer=>[initializer(),value=>changes.push(value)],useEffect:()=>{},useRef:value=>({current:value})},
    './AuthContext':{AuthContext:{Provider:()=>null}},'../config/demo':{DEMO_MODE:true},
    '../lib/demoSession':{getDemoSession:()=>fixture,createDemoSession:(d,result)=>{calls.push(['create',d,result]);return fixture},clearDemoSession:()=>calls.push(['clear'])},
    '../lib/otpApi':{verifyOtp:async()=>verified},
  })
  const api=DemoAuthProvider({children:null}).props.value
  assert.equal(api.profile,fixture);assert.equal(api.session,null);assert.equal(api.user,null)
  await api.completeDemoLogin(details,'483912')
  assert.equal(calls[0][0],'create')
  await api.signOut();assert.equal(calls[1][0],'clear');assert.equal(changes.at(-1),null)
  await assert.rejects(api.googleSignIn(),/prototype login/)
})
test('Supabase client is not initialized in demo mode even when credentials are configured',()=>{
  const source=readFileSync('src/lib/supabase.ts','utf8').replaceAll('import.meta.env.VITE_SUPABASE_URL','"https://test.supabase.co"').replaceAll('import.meta.env.VITE_SUPABASE_ANON_KEY','"sb_publishable_test-only"')
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  for(const enabled of [true,false]) {
    const calls=[];const exports={}
    vm.runInNewContext(output,{exports,URL,require:name=>name==='@supabase/supabase-js'?{createClient:(...args)=>{calls.push(args);return {auth:{}}}}:name==='../config/demo'?{DEMO_MODE:enabled}:{CONFIG_MESSAGE:'unavailable',StudentAccessError:Error}})
    assert.equal(calls.length,enabled?0:1)
    assert.equal(exports.isSupabaseConfigured,true)
    if(enabled) assert.equal(exports.supabase,null)
  }
})
test('prototype login offers email and academic level with no fixed-code hint',()=>{
  const {DemoLoginPage}=loadTypeScript('src/pages/DemoLoginPage.tsx',{'../contexts/AuthContext':{useAuth:()=>({})},'../config/demo':{DEMO_MODE:true}})
  const login=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(DemoLoginPage)))
  assert.ok(login.includes('Name'));assert.ok(login.includes('Student ID'))
  assert.equal((login.match(/type="radio"/g)??[]).length,2)
  assert.ok(!login.includes('type="password"'));assert.ok(login.includes('type="email"'))
  assert.ok(login.includes('Send OTP'));assert.ok(login.includes('Academic Level'))
  const {DemoOtp}=loadTypeScript('src/components/demo/DemoOtp.tsx')
  const otp=renderToStaticMarkup(createElement(DemoOtp,{email:details.email,cooldownDeadline:Date.now()+60000,onVerify:async()=>{},onResend:async()=>{},onBack:()=>{}}))
  assert.ok(!otp.includes('123456'));assert.ok(otp.includes('Verify OTP'));assert.ok(otp.includes(details.email))
  assert.ok(otp.includes('maxLength="6"'));assert.ok(otp.includes('inputMode="numeric"'))
})
