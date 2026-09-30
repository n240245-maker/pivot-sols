import assert from 'node:assert/strict'
import test from 'node:test'
import {loadTypeScript} from './load-typescript.mjs'

const body={name:'Student',email:'student@example.com',message:'Please add more reviewed resources.'}
const api=loadTypeScript('src/lib/contactApi.ts')
test('contact validation rejects blank, short, oversized and injected fields',()=>{
  assert.equal(api.validateContact(body),undefined)
  for(const [key,value] of [['name',' '],['name','A'],['name','A\nBcc: other@example.com'],['email','bad'],['message','short'],['message','x'.repeat(3001)]])assert.ok(api.validateContact({...body,[key]:value}))
})
test('contact API normalizes inputs and requires literal backend success',async()=>{
  const requests=[];let payload={success:true}
  const transport=loadTypeScript('src/lib/contactApi.ts',{},new Map(),{fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>payload}}})
  await transport.sendContactMessage({...body,name:' Student ',email:' STUDENT@example.com '})
  assert.equal(requests[0].url,'/api/contact')
  assert.deepEqual(JSON.parse(requests[0].options.body),body)
  assert.equal(requests[0].options.credentials,'omit')
  for(const invalid of [null,{}, {success:false},{success:'true'}]){payload=invalid;await assert.rejects(transport.sendContactMessage(body),/couldn't send/)}
})
test('contact API reports SMTP, network, malformed response and rate-limit failures safely',async()=>{
  for(const fetcher of [async()=>{throw new Error('secret')},async()=>({ok:false,status:503,json:async()=>({message:'private SMTP error'})}),async()=>({ok:true,json:async()=>{throw Error('parse')}})]){
    const transport=loadTypeScript('src/lib/contactApi.ts',{},new Map(),{fetch:fetcher})
    await assert.rejects(transport.sendContactMessage(body),error=>error.message==="We couldn't send your message. Please try again.")
  }
  const limited=loadTypeScript('src/lib/contactApi.ts',{},new Map(),{fetch:async()=>({status:429})})
  await assert.rejects(limited.sendContactMessage(body),/Too many messages/)
})
function nodes(tree){return !tree||typeof tree!=='object'?[]:Array.isArray(tree)?tree.flatMap(nodes):[tree,...nodes(tree.props?.children)]}
function harness(send){
  let index=0;const slots=[]
  const react={useState(initial){const i=index++;if(!(i in slots))slots[i]=initial;return[slots[i],v=>slots[i]=v]},useRef(initial){const i=index++;if(!(i in slots))slots[i]={current:initial};return slots[i]}}
  const {ContactContent}=loadTypeScript('src/pages/ContactPage.tsx',{react,'../contexts/AuthContext':{useAuth:()=>({})},'../lib/contactApi':{...api,sendContactMessage:send}})
  const draw=()=>{index=0;return ContactContent({profile:body})}
  return {draw,change(id,value){nodes(draw()).find(n=>n.props?.id===id).props.onChange({target:{value}})},submit(){return nodes(draw()).find(n=>n.type==='form').props.onSubmit({preventDefault(){}})}}
}
test('contact form prefills profile fields and validates before sending',async()=>{
  let sent=0;const h=harness(async()=>sent++)
  assert.equal(nodes(h.draw()).find(n=>n.props?.id==='contact-email').props.value,body.email)
  await h.submit();assert.equal(sent,0)
  assert.ok(nodes(h.draw()).some(n=>n.props?.role==='alert'))
})
test('contact form prevents duplicates, shows loading and confirms only successful delivery',async()=>{
  let resolve;const delivery=new Promise(yes=>resolve=yes);let calls=0
  const h=harness(async()=>{calls++;await delivery})
  h.change('contact-message',body.message)
  const pending=h.submit();await h.submit()
  assert.equal(calls,1)
  assert.ok(nodes(h.draw()).some(n=>n.type==='button'&&n.props.disabled&&n.props.children==='Sending message...'))
  assert.ok(!nodes(h.draw()).some(n=>n.props?.role==='status'))
  resolve();await pending
  assert.ok(nodes(h.draw()).some(n=>n.props?.role==='status'&&n.props.children==='Message sent successfully.'))
  assert.equal(nodes(h.draw()).find(n=>n.props?.id==='contact-message').props.value,'')
})
test('contact form preserves failed messages and allows a deliberate retry',async()=>{
  let fail=true;const h=harness(async()=>{if(fail)throw Error("We couldn't send your message. Please try again.")})
  h.change('contact-message',body.message);await h.submit()
  assert.ok(nodes(h.draw()).some(n=>n.props?.role==='alert'))
  assert.equal(nodes(h.draw()).find(n=>n.props?.id==='contact-message').props.value,body.message)
  assert.ok(!nodes(h.draw()).some(n=>n.props?.role==='status'))
  fail=false;await h.submit();assert.ok(nodes(h.draw()).some(n=>n.props?.role==='status'))
})
