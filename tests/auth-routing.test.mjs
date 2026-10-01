import assert from 'node:assert/strict'
import test from 'node:test'
import { loadTypeScript } from './load-typescript.mjs'

const Navigate=()=>null, Outlet=()=>null, LoadingScreen=()=>null, AccessProblem=()=>null
function routes(state){
  return loadTypeScript('src/components/ProtectedRoute.tsx',{
    '../config/demo':{DEMO_MODE:false},
    'react-router':{Navigate,Outlet},
    '../contexts/AuthContext':{useAuth:()=>state},
    './common/LoadingScreen':{LoadingScreen},
    './auth/AccessProblem':{AccessProblem},
  })
}
const valid={loading:false,error:null,session:{},user:{id:'student',email:'n260001@rguktn.ac.in',email_confirmed_at:'2026-09-14'},profile:{batch:26}}
test('protected routes wait for session verification and reject anonymous users',()=>{
  assert.equal(routes({loading:true}).ProtectedRoute().type,LoadingScreen)
  const route=routes({loading:false,user:null,session:null}).ProtectedRoute()
  assert.equal(route.type,Navigate);assert.equal(route.props.to,'/login')
})
test('protected routes deny wrong domains, unverified emails and unsupported profiles',()=>{
  for(const user of [{...valid.user,email:'test@gmail.com'},{...valid.user,email_confirmed_at:null}]) assert.equal(routes({...valid,user}).ProtectedRoute().props.to,'/login')
  assert.equal(routes({...valid,profile:{batch:25}}).ProtectedRoute().type,AccessProblem)
  assert.equal(routes({...valid,error:'Profile unavailable'}).ProtectedRoute().type,AccessProblem)
})
test('verified incomplete profiles route to completion; supported complete users enter',()=>{
  assert.equal(routes({...valid,profile:null}).ProtectedRoute().props.to,'/complete-profile')
  assert.equal(routes(valid).ProtectedRoute().type,Outlet)
})
test('login and signup redirect completed sessions away from guest pages',()=>{
  assert.equal(routes(valid).GuestRoute().props.to,'/dashboard')
  assert.equal(routes({...valid,profile:null}).GuestRoute().props.to,'/complete-profile')
  assert.equal(routes({loading:false,user:null}).GuestRoute().type,Outlet)
})

function authActions(){
  const calls=[]
  const states=[]
  const auth={
    signUp:async(args)=>{calls.push(['signup',args]);return {data:{user:{identities:[{}]},session:null},error:null}},
    signInWithPassword:async(args)=>{calls.push(['login',args]);return {error:null}},
    signInWithOAuth:async(args)=>{calls.push(['google',args]);return {error:null}},
    resend:async(args)=>{calls.push(['resend',args]);return {error:null}},
    signOut:async(args)=>{calls.push(['logout',args]);return {error:null}},
  }
  const {AuthProvider}=loadTypeScript('src/contexts/AuthContext.tsx',{
    react:{createContext:()=>({Provider:()=>null}),useCallback:(f)=>f,useContext:()=>null,useEffect:()=>{},useRef:(value)=>({current:value}),useState:(value)=>[value,(next)=>states.push(next)]},
    '../lib/supabase':{supabase:{auth},requireSupabase:()=>({auth}),isSupabaseConfigured:true,authCallbackUrl:()=> 'https://example.test/auth/callback'},
    '../lib/studentProfile':{assertVerifiedStudent:()=>{},resolveStudentProfile:()=>{}},
  })
  return {api:AuthProvider({children:null}).props.value,calls,states}
}
test('signup requests confirmation and stores normalized ID, never the password in metadata',async()=>{
  const s=authActions()
  const result=await s.api.signUp({name:' Test Student ',studentId:'n260001',email:' N260001@RGUKTN.AC.IN ',password:'test-password'})
  assert.equal(result.verificationRequired,true)
  const request=s.calls[0][1]
  assert.equal(request.options.emailRedirectTo,'https://example.test/auth/callback')
  assert.equal(request.options.data.student_id,'N260001')
  assert.equal(request.options.data.password,undefined)
  assert.equal(request.email,'n260001@rguktn.ac.in')
})
test('OAuth and resend use the shared current-origin callback',async()=>{
  const s=authActions()
  await s.api.googleSignIn()
  assert.equal(s.calls[0][1].provider,'google')
  assert.equal(s.calls[0][1].options.redirectTo,'https://example.test/auth/callback')
  await s.api.resendVerification('n260001@rguktn.ac.in')
  assert.equal(s.calls[1][1].type,'signup')
})
test('login validates domain before network calls and logout clears central state',async()=>{
  const s=authActions()
  await assert.rejects(s.api.logIn('test@gmail.com','test-password'))
  assert.equal(s.calls.length,0)
  await s.api.logIn('N260001@RGUKTN.AC.IN','test-password')
  assert.equal(s.calls[0][1].email,'n260001@rguktn.ac.in')
  await s.api.signOut()
  assert.equal(s.calls[1][0],'logout')
  assert.equal(s.calls[1][1].scope,'local')
  assert.equal(s.states.at(-1).user,null)
  assert.equal(s.states.at(-1).profile,null)
})
