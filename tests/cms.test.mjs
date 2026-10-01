import assert from 'node:assert/strict'
import test from 'node:test'
import * as React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter} from 'react-router'
import {loadTypeScript} from './load-typescript.mjs'
import {contentFixture,contentMocks} from './content-fixture.mjs'

const nodes=value=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(nodes):[value,...nodes(value.props?.children)]
const render=element=>renderToStaticMarkup(React.createElement(MemoryRouter,null,element))
function hooks(){
  let cursor=0;const slots=[];const effects=[]
  return {reset(){cursor=0},slots,effects,react:{...React,
    useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]},
    useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i]},
    useCallback(fn){return fn},useEffect(fn){effects.push(fn)},
  }}
}
const event={preventDefault(){}}
const {adminSections,newAdminValues}=loadTypeScript('src/config/adminFields.ts')
const {emptyAdminCatalog}=loadTypeScript('src/types/admin.ts')
const row={id:'book-id',title:'Database Book',subject_id:'subject',status:'published',created_at:'2026-09-24T00:00:00Z',updated_at:'2026-09-24T00:00:00Z'}
const catalog={...emptyAdminCatalog,books:[row],branches:[{id:'branch',name:'Test Engineering',short_name:'TE',status:'published'}],semesters:[{id:'semester',branch_id:'branch',academic_level:'E1',name:'Semester 2',status:'published'}],subjects:[{id:'subject',semester_id:'semester',name:'Signals',status:'published'}]}

test('public content transport uses the database endpoint and refuses errors or malformed payloads',async()=>{
  let value=contentFixture;let ok=true;const requests=[]
  const api=loadTypeScript('src/lib/contentApi.ts',{},new Map(),{fetch:async(url,options)=>{requests.push({url,options});return {ok,json:async()=>value}}})
  assert.equal(await api.fetchPublishedContent(),contentFixture)
  assert.equal(requests[0].url,'http://localhost:8000/api/public/catalog')
  assert.equal(requests[0].options.credentials,'omit')
  for(const invalid of [null,{}, {...contentFixture,domains:null}]){value=invalid;await assert.rejects(api.fetchPublishedContent(),/couldn't load/)}
  value=contentFixture;ok=false;await assert.rejects(api.fetchPublishedContent(),/couldn't load/)
})

test('content boundary hides stale content while loading, exposes retry, then renders published data',()=>{
  let status='loading',retried=0
  const {ContentBoundary}=loadTypeScript('src/components/resources/ContentBoundary.tsx',{'../../contexts/ContentContext':{useContent:()=>({status,reload:()=>retried++})}})
  const draw=()=>ContentBoundary({children:React.createElement('p',null,'Published database content')})
  assert.match(render(draw()),/Loading resources/);assert.doesNotMatch(render(draw()),/Published database/)
  status='error';assert.match(render(draw()),/couldn&#x27;t load/)
  nodes(draw()).find(n=>n.type==='button').props.onClick();assert.equal(retried,1)
  status='ready';assert.match(render(draw()),/Published database content/)
})

test('content provider discards obsolete requests and clears stale records after failure',async()=>{
  const h=hooks(),pending=[],listeners={}
  const {ContentProvider}=loadTypeScript('src/contexts/ContentContext.tsx',{react:h.react,'react-router':{useLocation:()=>({pathname:'/resources/books'})},'../lib/contentApi':{fetchPublishedContent:signal=>new Promise((resolve,reject)=>pending.push({resolve,reject,signal}))}},new Map(),{window:{addEventListener:(key,fn)=>listeners[key]=fn,removeEventListener:()=>{}}})
  const draw=()=>{h.reset();return ContentProvider({children:null}).props.value}
  draw();const cleanup=h.effects[1]();h.effects[0]();assert.equal(pending.length,1)
  draw().reload();assert.equal(pending[0].signal.aborted,true)
  pending[1].resolve(contentFixture);await new Promise(resolve=>setImmediate(resolve));assert.equal(draw().status,'ready')
  pending[0].resolve({...contentFixture,domains:[]});await new Promise(resolve=>setImmediate(resolve));assert.equal(draw().data.domains.length,16)
  listeners['pivot-content-changed']();pending[2].reject(new Error('private failure'));await new Promise(resolve=>setImmediate(resolve))
  assert.equal(draw().status,'error');assert.equal(draw().data.books.books.length,0);cleanup()
})

test('student pages and shared search render changed API content rather than seed defaults',()=>{
  const domain={...contentFixture.domains[0],id:'new-api-domain',slug:'database-only',name:'Database-only Domain'}
  const data={...contentFixture,domains:[domain],roles:[]}
  const mocks=Object.fromEntries(Object.keys(contentMocks).map(key=>[key,{useContent:()=>({data,status:'ready'})}]))
  const {CareerDomainsPage}=loadTypeScript('src/pages/CareerDomainsPage.tsx',mocks)
  const html=render(React.createElement(CareerDomainsPage))
  assert.match(html,/Database-only Domain/);assert.doesNotMatch(html,/href="\/careers\/domains\/vlsi"/)
  const {buildLocalSearchIndex}=loadTypeScript('src/lib/localSearch.ts')
  const index=buildLocalSearchIndex('E1',data.books,data.labs,data.domains,data.roles,data.branches)
  assert.ok(index.some(item=>item.to==='/careers/domains/database-only'));assert.ok(!index.some(item=>item.to==='/careers/domains/vlsi'))
})

test('database books preserve details and resource actions with truthful availability',()=>{
  const book={...contentFixture.books.books[0],title:'Published database book',resourceUrl:'https://example.com/library/book',type:'Open textbook'}
  const {BookCard}=loadTypeScript('src/components/resources/books/BookCard.tsx')
  const {BookDetailsModal}=loadTypeScript('src/components/resources/books/BookDetailsModal.tsx')
  const card=render(React.createElement(BookCard,{book,demo:false,subjectName:'Signals'}))
  assert.match(card,/View Details/);assert.match(card,/Open Resource/);assert.match(card,/Open textbook/)
  const details=render(React.createElement(BookDetailsModal,{book,demo:false,subjectName:'Signals',onClose(){}}))
  assert.match(details,/A resource link is available/);assert.doesNotMatch(details,/will be added in the full version/)
  assert.match(details,/rel="noopener noreferrer"/)
  const unavailable=render(React.createElement(BookDetailsModal,{book:{...book,resourceUrl:undefined},demo:false,subjectName:'Signals',onClose(){}}))
  assert.match(unavailable,/Resource coming soon/);assert.doesNotMatch(unavailable,/Open Resource/)
})

test('admin API includes cookies and CSRF, invalidates expired sessions and masks transport failures',async()=>{
  const requests=[],events=[];let status=200,value={admin:{email:'admin@example.com'},csrf_token:'test-csrf'}
  const {adminApi}=loadTypeScript('src/lib/adminApi.ts',{},new Map(),{Event,window:{dispatchEvent:e=>events.push(e.type)},fetch:async(url,options)=>{requests.push({url,options});return{ok:status===200,status,json:async()=>value}}})
  await adminApi.me();await adminApi.status('books',row,'draft')
  const sent=requests.at(-1);assert.equal(sent.options.credentials,'include');assert.equal(sent.options.headers['X-CSRF-Token'],'test-csrf')
  assert.deepEqual(JSON.parse(sent.options.body),{status:'draft',expected_updated_at:row.updated_at})
  status=401;value={detail:{message:'Sign in again'}};await assert.rejects(adminApi.catalog(),/Sign in again/);assert.deepEqual(events,['pivot-admin-expired'])
  await assert.rejects(adminApi.login('admin@example.com','test-only'),/Sign in again/);assert.equal(events.length,1)
  const offline=loadTypeScript('src/lib/adminApi.ts',{},new Map(),{fetch:async()=>{throw Error('private driver detail')}})
  await assert.rejects(offline.adminApi.catalog(),error=>error.message==='Unable to reach the agent service. Please try again.')
})

test('admin route guard checks server identity and supports retry without accepting a student profile',()=>{
  let state={admin:null,loading:true,error:'',refresh:()=>{state.error=''}}
  const {AdminGuard}=loadTypeScript('src/contexts/AdminContext.tsx',{react:{...React,useContext:()=>state},'../lib/adminApi':{adminApi:{},AdminApiError:Error}})
  assert.match(render(AdminGuard()),/Checking agent session/)
  state.loading=false;assert.equal(AdminGuard().props.to,'/admin/login')
  state.profile={email:'student@example.com'};assert.equal(AdminGuard().props.to,'/admin/login')
  state.error='Service unavailable';const tree=AdminGuard();assert.equal(tree.props.role,'alert');nodes(tree).find(n=>n.type==='button').props.onClick();assert.equal(state.error,'')
  state.admin={email:'admin@example.com'};assert.equal(AdminGuard().type.name,'Outlet')
})

test('admin login requires password then OTP, prevents duplicate sends and accepts only verified identity',async()=>{
  const h=hooks(),calls=[];let finish,accepted,navigated
  const api={login:async(...args)=>{calls.push(args);await new Promise(resolve=>finish=resolve);return {challenge:'challenge-token',resend_after:60}},verify:async(token,otp)=>{assert.equal(token,'challenge-token');assert.equal(otp,'123456');return {admin:{email:'admin@example.com'}}}}
  const {AdminLoginPage}=loadTypeScript('src/pages/admin/AdminLoginPage.tsx',{react:h.react,'../../contexts/AdminContext':{useAdmin:()=>({admin:null,loading:false,accept:admin=>accepted=admin})},'../../lib/adminApi':{adminApi:api},'../../hooks/useOtpCountdown':{useOtpCountdown:()=>60},'react-router':{...await import('react-router'),useNavigate:()=>path=>navigated=path}})
  const draw=()=>{h.reset();return AdminLoginPage()}
  const input=type=>nodes(draw()).find(n=>n.type==='input'&&n.props.type===type)
  input('email').props.onChange({target:{value:'admin@example.com'}});input('password').props.onChange({target:{value:'test-only password'}})
  const submit=()=>nodes(draw()).find(n=>n.type==='form').props.onSubmit(event)
  const pending=submit();await submit();assert.equal(calls.length,1);finish();await pending
  assert.equal(accepted,undefined);assert.ok(!input('password'));assert.equal(h.slots[1],'')
  nodes(draw()).find(n=>n.type==='input'&&n.props.inputMode==='numeric').props.onChange({target:{value:'123456'}})
  await submit();assert.equal(accepted.email,'admin@example.com');assert.equal(navigated,'/admin')
})

test('admin dashboard counts database statuses and exposes every management section',()=>{
  const {AdminDashboard}=loadTypeScript('src/pages/admin/AdminShell.tsx',{react:{...React,useContext:()=>({catalog})},'../../contexts/AdminContext':{useAdmin:()=>({})}})
  const html=render(React.createElement(AdminDashboard))
  for(const section of adminSections)assert.ok(html.includes(`href="/admin/${section.path}"`))
  assert.match(html,/4<\/strong>/);assert.match(html,/1 records/)
})

test('every CRUD form exposes structured fields, placement, status and protected preview',()=>{
  for(const section of adminSections){
    const {AdminResourcePage}=loadTypeScript('src/pages/admin/AdminResourcePage.tsx',{'./AdminShell':{useAdminCatalog:()=>({catalog,reload:async()=>{}})},'react-router':{...awaitRouter,useLocation:()=>({pathname:`/admin/${section.path}/new`}),useParams:()=>({}),useNavigate:()=>()=>{}}})
    const html=render(React.createElement(AdminResourcePage,{section}))
    assert.ok(html.includes(`Add ${section.singular}`));assert.match(html,/Save changes/);assert.match(html,/Preview/);assert.match(html,/Draft/)
    if(['subjects','books','labs','experiments'].includes(section.resource))assert.match(html,/Academic placement/)
    if(section.resource==='experiments')for(const label of ['Apparatus','Procedure','Video URL','youtube','mp4'])assert.ok(html.includes(label))
    if(section.resource==='career-domains')assert.match(html,/Add core skills/)
    if(section.resource==='site-content')assert.match(html,/Introduction/)
    assert.doesNotMatch(html,/<textarea[^>]*>\{/)
  }
})
const awaitRouter=await import('react-router')

test('repeatable content edits preserve order, remove items and normalize the save payload',()=>{
  const forms=loadTypeScript('src/components/admin/AdminForms.tsx');let values=['First','Second']
  const draw=()=>forms.RepeatableStrings({label:'Procedure',value:values,onChange:v=>values=v})
  nodes(draw()).find(n=>n.props?.['aria-label']==='Procedure 2').props.onChange({target:{value:'Updated'}})
  nodes(draw()).find(n=>n.props?.['aria-label']==='Remove Procedure 1').props.onClick();assert.equal(values.join(','),'Updated')
  const body=forms.prepareAdminBody({...row,authors:[' Author ',' '],resource_url:'',academic_level:'P1',branch_id:'branch'})
  assert.equal(body.id,undefined);assert.equal(body.expected_updated_at,row.updated_at);assert.equal(body.resource_url,null);assert.equal(body.branch_id,null);assert.equal(body.authors.join(','),'Author')
  assert.equal(forms.relationLabel(row,catalog),'Signals · Semester 2 · TE')
})

test('archive checks dependencies and waits for confirmation; published children block the confirmation',async()=>{
  const h=hooks(),calls=[];let deps=[]
  const {AdminResourcePage}=loadTypeScript('src/pages/admin/AdminResourcePage.tsx',{react:h.react,'./AdminShell':{useAdminCatalog:()=>({catalog,reload:async()=>{}})},'../../lib/adminApi':{AdminApiError:Error,adminApi:{dependencies:async()=>{calls.push('dependencies');return {dependencies:deps}},status:async(resource,record,status)=>calls.push(status)}},'react-router':{...awaitRouter,useLocation:()=>({pathname:'/admin/books'}),useParams:()=>({})}},new Map(),{window:{dispatchEvent(){}},Event})
  const draw=()=>{h.reset();return AdminResourcePage({section:adminSections.find(s=>s.resource==='books')})}
  nodes(draw()).find(n=>n.type==='button'&&n.props.children==='Archive').props.onClick();await new Promise(resolve=>setImmediate(resolve))
  assert.deepEqual(calls,['dependencies'])
  let confirmation=nodes(draw()).find(n=>n.type?.name==='ConfirmStatus')
  confirmation.props.onConfirm();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,['dependencies','archived'])
  deps=[{resource:'experiments',total:2,published:1}]
  nodes(draw()).find(n=>n.type==='button'&&n.props.children==='Archive').props.onClick();await new Promise(resolve=>setImmediate(resolve))
  confirmation=nodes(draw()).find(n=>n.type?.name==='ConfirmStatus')
  const rendered=confirmation.type(confirmation.props)
  assert.equal(nodes(rendered).find(n=>n.type==='button'&&n.props.children==='Archive content').props.disabled,true)
})
