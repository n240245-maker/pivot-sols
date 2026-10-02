import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter} from 'react-router'
import {loadTypeScript} from './load-typescript.mjs'
import {contentMocks} from './content-fixture.mjs'

function restoredProvider(profile) {
  const slots=[],effects=[];let index=0
  const {DemoAuthProvider}=loadTypeScript('src/contexts/DemoAuthContext.tsx',{
    react:{useState:initial=>{const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},useRef:value=>{const i=index++;return slots[i]??(slots[i]={current:value})},useEffect:effect=>effects.push(effect)},
    './AuthContext':{AuthContext:{Provider:()=>null}},
    '../lib/studentSessionApi':{getStudentSession:async()=>profile,loginStudent:async()=>{},clearStudentServerSession:async()=>{}},
  })
  return {render:()=>{index=0;return DemoAuthProvider({children:null}).props.value},restore:()=>effects[0]()}
}

test('fresh app loads server session before deciding protected route',async()=>{
  for(const level of ['P1','E1']) {
    const profile={id:'server-id',name:'Restored Student',studentId:level==='P1'?'N260001':'N240001',academicLevel:level,batch:0,campus:'Nuzvid'}
    const provider=restoredProvider(profile)
    assert.equal(provider.render().loading,true)
    assert.equal(provider.render().profile,null)
    provider.restore()
    await new Promise(resolve=>setTimeout(resolve,0))
    const restored=provider.render()
    assert.equal(restored.loading,false)
    assert.equal(restored.profile.academicLevel,level)
    const {DashboardContent}=loadTypeScript('src/pages/DashboardPage.tsx',{
      ...contentMocks,
      '../contexts/AuthContext':{useAuth:()=>({profile:restored.profile})},
    })
    const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(DashboardContent,{profile:restored.profile})))
    assert.ok(level==='P1'?html.includes('I3 Block Rooms')&&!html.includes('Career Domains'):html.includes('Career Domains')&&!html.includes('I3 Block Rooms'))
  }
})

test('Vercel API proxy precedes SPA fallback and preserves /api path once',()=>{
  const rewrites=JSON.parse(readFileSync('vercel.json','utf8')).rewrites
  assert.equal(rewrites[0].source,'/api/:path*')
  assert.equal(rewrites[0].destination,'https://pivot-sols-api.onrender.com/api/:path*')
  assert.equal(rewrites[1].destination,'/index.html')
  const api=loadTypeScript('src/config/api.ts')
  assert.equal(api.API_BASE_URL,'')
})
