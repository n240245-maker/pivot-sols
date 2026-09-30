import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { loadTypeScript } from './load-typescript.mjs'

const realApi = loadTypeScript('src/lib/otpApi.ts')
const details = {name:'Harsha',studentId:'N240001',year:'E1',email:'student@example.com'}
const verified = {success:true,verified:true}
const event = {preventDefault(){}}
function storage() {
  const values=new Map()
  return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}
}
function deferred() { let resolve,reject; const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject} }
function nodes(tree) {
  if(!tree||typeof tree!=='object') return []
  if(Array.isArray(tree)) return tree.flatMap(nodes)
  return [tree,...nodes(tree.props?.children)]
}
function text(tree) {
  if(tree==null||typeof tree==='boolean') return ''
  if(typeof tree==='string'||typeof tree==='number') return String(tree)
  if(Array.isArray(tree)) return tree.map(text).join('')
  return text(tree.props?.children)
}
function find(tree,fn) { const result=nodes(tree).find(fn);assert.ok(result,'Expected UI element');return result }
function button(tree,label) { return find(tree,n=>n.type==='button'&&text(n).includes(label)) }
// Exercise real component handlers with persistent hook slots; no DOM or API bypass is added to the app.
function renderComponent(file,name,props={},mocks={}) {
  let index=0;const slots=[]
  const react={
    useState(initial){const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v}]},
    useRef(initial){const i=index++;if(!(i in slots))slots[i]={current:initial};return slots[i]},
    useEffect(){},
  }
  const module=loadTypeScript(file,{react,...mocks})
  return ()=>{index=0;return module[name](props)}
}
function loginHarness(send,complete=async()=>{}) {
  const navigations=[]
  const render=renderComponent('src/pages/DemoLoginPage.tsx','DemoLoginPage',{}, {
    'react-router':{Link:()=>null,Navigate:()=>null,useNavigate:()=>path=>navigations.push(path)},
    '../contexts/AuthContext':{useAuth:()=>({completeDemoLogin:complete})},
    '../lib/otpApi':{...realApi,sendOtp:send},
    '../hooks/useOtpCountdown':{useOtpCountdown:deadline=>Math.max(0,Math.ceil((deadline-Date.now())/1000))},
  })
  for(const [id,value] of [['demo-name',details.name],['demo-student-id',details.studentId],['demo-email',details.email]]) find(render(),n=>n.props?.id===id).props.onChange({target:{value}})
  find(render(),n=>n.type==='input'&&n.props.value==='E1').props.onChange()
  return {render,navigations,otp:()=>find(render(),n=>n.type?.name==='DemoOtp')}
}

test('API helper posts normalized email and never treats send as verification',async()=>{
  const requests=[]
  const api=loadTypeScript('src/lib/otpApi.ts',{},new Map(),{fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({success:true,message:'OTP sent successfully'})}}})
  assert.equal(await api.sendOtp(' Student@Example.com '),undefined)
  assert.equal(requests[0].url,'/api/auth/send-otp')
  assert.deepEqual(JSON.parse(requests[0].options.body),{email:'student@example.com'})
  assert.equal(requests[0].options.credentials,'omit')
  await assert.rejects(api.verifyOtp(details.email,'483912'),/verification service/)
})

test('API verify requires literal verified true and validates the code format',async()=>{
  let response={success:true,verified:false};let count=0
  const api=loadTypeScript('src/lib/otpApi.ts',{},new Map(),{fetch:async()=>{count++;return {ok:true,json:async()=>response}}})
  for(const code of ['12345','1234567','abc123','１２３４５６']) await assert.rejects(api.verifyOtp(details.email,code))
  assert.equal(count,0)
  for(const value of [false,'true',1,undefined]) {response={success:true,verified:value};await assert.rejects(api.verifyOtp(details.email,'483912'))}
  response=verified
  assert.equal((await api.verifyOtp(details.email,'483912')).verified,true)
})

test('OTP submits profile to backend and /me restores P1 or E1 without a browser login flag',async()=>{
  const requests=[]
  const profile={id:'server-id',name:'Harsha',studentId:'N240001',email:details.email,academicLevel:'E1',batch:0,campus:'Nuzvid'}
  const api=loadTypeScript('src/lib/otpApi.ts',{},new Map(),{fetch:async(url,options)=>{
    requests.push({url,options})
    return {ok:true,status:200,json:async()=>url.endsWith('/verify-otp')?verified:{profile}}
  }})
  await api.verifyOtp(details.email,'483912',details)
  assert.deepEqual(JSON.parse(requests[0].options.body),{email:details.email,otp:'483912',name:details.name,student_id:details.studentId,academic_level:'E1'})
  assert.equal(requests[0].options.credentials,'include')
  assert.equal((await api.getStudentSession()).academicLevel,'E1')
  assert.equal(requests[1].url,'/api/auth/me')
  assert.equal(requests[1].options.credentials,'include')
  const missing=loadTypeScript('src/lib/otpApi.ts',{},new Map(),{fetch:async()=>({ok:false,status:401})})
  assert.equal(await missing.getStudentSession(),null)
})

test('student logout calls backend and refuses to claim success on failure',async()=>{
  const requests=[]
  const api=loadTypeScript('src/lib/otpApi.ts',{},new Map(),{fetch:async(url,options)=>{requests.push({url,options});return {ok:true}}})
  await api.clearStudentServerSession()
  assert.equal(requests[0].url,'/api/auth/logout')
  assert.equal(requests[0].options.credentials,'include')
  const failed=loadTypeScript('src/lib/otpApi.ts',{},new Map(),{fetch:async()=>({ok:false})})
  await assert.rejects(failed.clearStudentServerSession(),/Unable to log out/)
})

test('API maps wrong, expired, locked, throttled and delivery errors without exposing server text',async()=>{
  for(const [code,part] of [['invalid_otp','incorrect'],['expired_otp','expired'],['attempts_exceeded','Too many incorrect'],['rate_limited','Too many OTP requests'],['delivery_failed',"couldn't send"]]) {
    const api=loadTypeScript('src/lib/otpApi.ts',{},new Map(),{fetch:async()=>({ok:false,status:429,json:async()=>({code,message:'sensitive server text',retry_after:47})})})
    await assert.rejects(api.sendOtp(details.email),error=>error.message.includes(part)&&!error.message.includes('sensitive')&&error.retryAfter===47)
  }
})

test('network errors and malformed responses produce safe service errors',async()=>{
  for(const fetcher of [async()=>{throw Error('private diagnostic')},async()=>({ok:true,json:async()=>null}),async()=>({ok:true,json:async()=>{throw Error('not json')}})]) {
    const api=loadTypeScript('src/lib/otpApi.ts',{},new Map(),{fetch:fetcher})
    await assert.rejects(api.sendOtp(details.email),/Unable to reach the verification service/)
  }
})

test('Send OTP waits for backend success, blocks duplicates and does not authenticate',async()=>{
  const send=deferred();const emails=[];const completed=[]
  const h=loginHarness(email=>{emails.push(email);return send.promise},async(...args)=>completed.push(args))
  const submit=find(h.render(),n=>n.type==='form').props.onSubmit
  const pending=submit(event)
  assert.ok(button(h.render(),'Sending OTP...').props.disabled)
  await submit(event)
  assert.equal(emails.length,1)
  assert.equal(nodes(h.render()).some(n=>n.type?.name==='DemoOtp'),false)
  assert.equal(completed.length,0);assert.equal(h.navigations.length,0)
  send.resolve();await pending
  assert.equal(h.otp().props.email,details.email)
  assert.ok(h.otp().props.cooldownDeadline>Date.now())
  assert.equal(completed.length,0);assert.equal(h.navigations.length,0)
})

test('failed send stays on details with an error and invalid email never sends',async()=>{
  let sends=0
  const h=loginHarness(async()=>{sends++;throw new realApi.OtpApiError('delivery_failed')})
  await find(h.render(),n=>n.type==='form').props.onSubmit(event)
  assert.ok(text(h.render()).includes("couldn't send"));assert.equal(sends,1)
  find(h.render(),n=>n.props?.id==='demo-email').props.onChange({target:{value:'invalid'}})
  await find(h.render(),n=>n.type==='form').props.onSubmit(event)
  assert.equal(sends,1)
  assert.equal(find(h.render(),n=>n.props?.id==='demo-email').props.error,'Enter a valid email address.')
})

test('Change email returns to details and the next send uses the changed recipient',async()=>{
  const emails=[];const h=loginHarness(async email=>emails.push(email))
  await find(h.render(),n=>n.type==='form').props.onSubmit(event)
  h.otp().props.onBack()
  find(h.render(),n=>n.props?.id==='demo-email').props.onChange({target:{value:'other@example.com'}})
  await find(h.render(),n=>n.type==='form').props.onSubmit(event)
  assert.deepEqual(emails,[details.email,'other@example.com'])
  assert.equal(h.navigations.length,0)
})

test('navigation waits for verified-session creation and a rejected verification does not navigate',async()=>{
  let result=deferred();const h=loginHarness(async()=>{},()=>result.promise)
  await find(h.render(),n=>n.type==='form').props.onSubmit(event)
  const failure=h.otp().props.onVerify('483912')
  result.reject(Error('incorrect'));await assert.rejects(failure)
  assert.equal(h.navigations.length,0)
  result=deferred();const success=h.otp().props.onVerify('483912')
  assert.equal(h.navigations.length,0)
  result.resolve();await success
  assert.deepEqual(h.navigations,['/dashboard'])
})

test('OTP input retains only six digits, displays wrong-code errors and prevents duplicate verification',async()=>{
  const check=deferred();const codes=[]
  const render=renderComponent('src/components/demo/DemoOtp.tsx','DemoOtp',{email:details.email,cooldownDeadline:0,onVerify:code=>{codes.push(code);return check.promise},onResend:async()=>{},onBack:()=>{}},{'../../hooks/useOtpCountdown':{useOtpCountdown:()=>0}})
  find(render(),n=>n.props?.id==='demo-otp').props.onChange({target:{value:'48a3912b999'}})
  assert.equal(find(render(),n=>n.props?.id==='demo-otp').props.value,'483912')
  const submit=find(render(),n=>n.type==='form').props.onSubmit
  const pending=submit(event);await submit(event)
  assert.ok(button(render(),'Verifying...').props.disabled)
  assert.equal(codes.length,1)
  check.reject(new realApi.OtpApiError('invalid_otp'));await pending
  assert.equal(find(render(),n=>n.props?.id==='demo-otp').props.error,'The verification code is incorrect.')
})

test('resend countdown blocks sends until zero and resend clears the previous input',async()=>{
  const countdown=loadTypeScript('src/hooks/useOtpCountdown.ts')
  assert.equal(countdown.getCooldownSeconds(60_000,13_000),47)
  assert.equal(countdown.getCooldownSeconds(60_000,60_000),0)
  assert.equal(countdown.getCooldownSeconds(60_000,90_000),0)
  let remaining=47,calls=0,changed=0
  const send=deferred()
  const render=renderComponent('src/components/demo/DemoOtp.tsx','DemoOtp',{email:details.email,cooldownDeadline:60_000,onVerify:async()=>{},onResend:()=>{calls++;return send.promise},onBack:()=>changed++},{'../../hooks/useOtpCountdown':{useOtpCountdown:()=>remaining}})
  assert.ok(button(render(),'Resend OTP in 47s').props.disabled)
  await button(render(),'Resend OTP').props.onClick();assert.equal(calls,0)
  remaining=0
  find(render(),n=>n.props?.id==='demo-otp').props.onChange({target:{value:'483912'}})
  const pending=button(render(),'Resend OTP').props.onClick()
  assert.ok(button(render(),'Sending...').props.disabled)
  assert.equal(find(render(),n=>n.props?.id==='demo-otp').props.value,'')
  send.resolve();await pending
  assert.equal(calls,1);assert.ok(text(render()).includes('A new verification code has been sent.'))
  button(render(),'Change email').props.onClick();assert.equal(changed,1)
})

test('provider waits for server verification, restores profile and cancels late login after logout',async()=>{
  let check=deferred();const slots=[];let index=0,logoutCount=0
  const restored={id:'server-session',name:details.name,studentId:details.studentId,academicLevel:'E1',email:details.email,batch:0,campus:'Nuzvid'}
  const {DemoAuthProvider}=loadTypeScript('src/contexts/DemoAuthContext.tsx',{
    react:{useState:initial=>{const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},useRef:value=>{const i=index++;return slots[i]??(slots[i]={current:value})},useEffect:()=>{}},
    './AuthContext':{AuthContext:{Provider:()=>null}},
    '../lib/otpApi':{verifyOtp:()=>check.promise,getStudentSession:async()=>restored,clearStudentServerSession:async()=>{logoutCount++}},
  })
  const render=()=>{index=0;return DemoAuthProvider({children:null}).props.value}
  let api=render();assert.equal(api.profile,null);assert.equal(api.loading,true)
  const pending=api.completeDemoLogin(details,'483912')
  assert.equal(render().profile,null)
  check.resolve(verified);await pending
  api=render();assert.equal(api.profile.academicLevel,'E1')
  await api.signOut();assert.equal(render().profile,null);assert.equal(logoutCount,1)
  check=deferred();const late=api.completeDemoLogin(details,'483912')
  await api.signOut();check.resolve(verified)
  await assert.rejects(late,/session changed/)
  assert.equal(render().profile,null)
})

test('fixed OTP bypass and hint are absent from active prototype source',()=>{
  for(const path of ['src/lib/demoSession.ts','src/contexts/DemoAuthContext.tsx','src/pages/DemoLoginPage.tsx','src/components/demo/DemoOtp.tsx','src/lib/otpApi.ts']) {
    const source=readFileSync(path,'utf8')
    assert.ok(!source.includes('123456'),path)
    assert.ok(!source.includes('Demo OTP:'),path)
  }
})
