import assert from 'node:assert/strict'
import test from 'node:test'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter} from 'react-router'
import {loadTypeScript} from './load-typescript.mjs'

const details={name:' Harsha  Student ',studentId:' n240245 ',year:'E1'}
const event={preventDefault(){}}
function nodes(tree){
  if(!tree||typeof tree!=='object')return []
  if(Array.isArray(tree))return tree.flatMap(nodes)
  return [tree,...nodes(tree.props?.children)]
}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}
function loginHarness(complete){
  const slots=[];let cursor=0;const navigations=[]
  const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},
    useRef(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial})}}
  const {DemoLoginPage}=loadTypeScript('src/pages/DemoLoginPage.tsx',{
    react,'react-router':{Link:()=>null,Navigate:()=>null,useNavigate:()=>path=>navigations.push(path)},
    '../contexts/AuthContext':{useAuth:()=>({completeDemoLogin:complete})},
  })
  const draw=()=>{cursor=0;return DemoLoginPage()}
  const field=id=>nodes(draw()).find(node=>node.props?.id===id)
  const submit=()=>nodes(draw()).find(node=>node.type==='form').props.onSubmit(event)
  return {draw,field,submit,navigations}
}

test('student login form contains only name, ID, year and Continue',()=>{
  const {DemoLoginPage}=loadTypeScript('src/pages/DemoLoginPage.tsx',{'../contexts/AuthContext':{useAuth:()=>({})}})
  const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(DemoLoginPage)))
  for(const label of ['Student Name','ID Number','Year','Continue','Agent Login'])assert.ok(html.includes(label),label)
  assert.equal((html.match(/type="radio"/g)??[]).length,2)
  for(const word of ['OTP','verification code','Send OTP','Resend','type="email"'])assert.ok(!html.includes(word),word)
})

test('student form validates name and ID, normalizes input and waits for login',async()=>{
  const pending=deferred();const calls=[]
  const form=loginHarness(value=>{calls.push(value);return pending.promise})
  await form.submit()
  assert.equal(calls.length,0)
  assert.equal(form.field('demo-name').props.error,'Enter your name.')
  form.field('demo-name').props.onChange({target:{value:details.name}})
  form.field('demo-student-id').props.onChange({target:{value:'<script>'}})
  await form.submit();assert.equal(calls.length,0)
  form.field('demo-student-id').props.onChange({target:{value:details.studentId}})
  const running=form.submit();await form.submit()
  assert.equal(calls.length,1)
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),{name:'Harsha Student',studentId:'N240245',year:'P1'})
  assert.equal(form.navigations.length,0)
  pending.resolve();await running
  assert.deepEqual(form.navigations,['/dashboard'])
})

test('student form can choose E1 and failed login remains on form',async()=>{
  const form=loginHarness(async()=>{throw Error('Unable to sign in.')})
  form.field('demo-name').props.onChange({target:{value:'Harsha'}})
  form.field('demo-student-id').props.onChange({target:{value:'N240245'}})
  nodes(form.draw()).find(node=>node.type==='input'&&node.props.value==='E1').props.onChange()
  await form.submit()
  assert.equal(form.navigations.length,0)
  assert.ok(nodes(form.draw()).some(node=>node.props?.role==='alert'))
})

test('student API creates a cookie session without email or OTP and restores either year',async()=>{
  const requests=[];let profile={id:'safe-id',name:'Harsha',studentId:'N240245',academicLevel:'E1',batch:0,campus:'Nuzvid'}
  const api=loadTypeScript('src/lib/studentSessionApi.ts',{},new Map(),{fetch:async(url,options)=>{
    requests.push({url,options})
    return {ok:true,status:200,json:async()=>url.endsWith('/login')?{success:true,student:profile}:{profile}}
  }})
  await api.loginStudent(details)
  assert.equal(requests[0].url,'/api/auth/login')
  assert.equal(requests[0].options.credentials,'include')
  assert.deepEqual(JSON.parse(requests[0].options.body),{name:'Harsha  Student',student_id:'N240245',academic_level:'E1'})
  assert.ok(!requests[0].options.body.includes('email')&&!requests[0].options.body.includes('otp'))
  assert.equal((await api.getStudentSession()).academicLevel,'E1')
  profile={...profile,academicLevel:'P1'}
  assert.equal((await api.getStudentSession()).academicLevel,'P1')
})

test('student session API treats 401 as logged out and sends logout to server',async()=>{
  const requests=[]
  const api=loadTypeScript('src/lib/studentSessionApi.ts',{},new Map(),{fetch:async(url,options)=>{
    requests.push({url,options})
    return url.endsWith('/me')?{ok:false,status:401}:{ok:true,status:200}
  }})
  assert.equal(await api.getStudentSession(),null)
  await api.clearStudentServerSession()
  assert.equal(requests[1].options.method,'POST')
  assert.equal(requests[1].options.credentials,'include')
})

test('student context authenticates only after backend session restoration',async()=>{
  const profile={id:'safe-id',name:'Harsha',studentId:'N240245',academicLevel:'E1',batch:0,campus:'Nuzvid'}
  const slots=[],effects=[];let index=0,calls=0
  const {DemoAuthProvider}=loadTypeScript('src/contexts/DemoAuthContext.tsx',{
    react:{useState:initial=>{const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},useRef:value=>{const i=index++;return slots[i]??(slots[i]={current:value})},useEffect:effect=>effects.push(effect)},
    './AuthContext':{AuthContext:{Provider:()=>null}},
    '../lib/studentSessionApi':{loginStudent:async()=>{calls++},getStudentSession:async()=>profile,clearStudentServerSession:async()=>{}},
  })
  const draw=()=>{index=0;return DemoAuthProvider({children:null}).props.value}
  assert.equal(draw().loading,true)
  effects[0]();await new Promise(resolve=>setTimeout(resolve,0))
  assert.equal(draw().profile.studentId,'N240245')
  await draw().completeDemoLogin(details)
  assert.equal(calls,1)
  await draw().signOut()
  assert.equal(draw().profile,null)
})
