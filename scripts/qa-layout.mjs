// Local, read-only layout smoke test of rendered feature pages at target widths.
// Requires a completed `npm run build` and an installed Chrome on Windows.
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { loadTypeScript } from '../tests/load-typescript.mjs'
import { contentFixture, contentMocks } from '../tests/content-fixture.mjs'

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const temp = mkdtempSync(join(tmpdir(), 'pivot-layout-'))
const css = readdirSync(resolve('dist/assets')).filter(name => name.endsWith('.css'))
const styles = css.map(name => `<link rel="stylesheet" href="${pathToFileURL(resolve('dist/assets',name)).href}">`).join('')
const profile = {id:'layout-only',name:'Layout Test',studentId:'N260000',batch:26,academicLevel:'P1',campus:'Nuzvid',email:'layout@example.test'}
const render = (component, props={}, path='/dashboard') => renderToStaticMarkup(h(MemoryRouter,{initialEntries:[path]},h(component,props)))
const dashboard = loadTypeScript('src/pages/DashboardPage.tsx',{...contentMocks,'../contexts/AuthContext':{useAuth:()=>({profile})}}).DashboardContent
const rooms = loadTypeScript('src/pages/RoomsPage.tsx',contentMocks).RoomsPage
const faculty = loadTypeScript('src/pages/FacultyPage.tsx',contentMocks).FacultyPage
const domains = loadTypeScript('src/pages/CareerDomainsPage.tsx',contentMocks).CareerDomainsPage
const jobs = loadTypeScript('src/pages/CareerJobsPage.tsx',contentMocks).CareerJobsPage
const { adminSections } = loadTypeScript('src/config/adminFields.ts')
const catalog = {...loadTypeScript('src/types/admin.ts').emptyAdminCatalog,
  rooms:[{id:'qa-room',name:'Test Office',room_number:'QA-201',phone_number:'08656-123456',status:'published',sort_order:0,updated_at:'2026-09-27T00:00:00Z'}],
  faculty:[{id:'qa-faculty',name:'Test Faculty',subject_id:'qa-subject',status:'published',sort_order:0,updated_at:'2026-09-27T00:00:00Z'}],
  'career-resources':[{id:'qa-resource',title:'Test PDF Resource',resource_type:'domain',status:'published',sort_order:0,updated_at:'2026-09-27T00:00:00Z'}]}
const adminMocks = {'./AdminShell':{useAdminCatalog:()=>({catalog,reload:async()=>{}})},'../../lib/adminApi':{adminApi:{}}}
const admin = loadTypeScript('src/pages/admin/AdminResourcePage.tsx',adminMocks).AdminResourcePage
const pages = [
  ['p1-dashboard',render(dashboard,{profile})],
  ['e1-dashboard',render(dashboard,{profile:{...profile,academicLevel:'E1',studentId:'N240000'}})],
  ['rooms',render(rooms,{},'/campus/rooms')],
  ['faculty',render(faculty,{},'/faculty')],
  ['career-domains',render(domains,{},'/careers/domains?branch=ece')],
  ['career-jobs',render(jobs,{},'/careers/jobs?branch=cse')],
  ...[['admin-rooms','rooms'],['admin-faculty','faculty'],['admin-career','career-domain-resources']].map(([name,path])=>[name,render(admin,{section:adminSections.find(item=>item.path===path)},`/admin/${path}`)])
]
for (const [name, markup] of pages) {
  const isAdmin = name.startsWith('admin-')
  const content = isAdmin
    ? `<div class="admin-shell"><aside class="admin-sidebar"><nav><a>Overview</a><a>Rooms</a><a>Faculty</a><a>Career Resources</a></nav></aside><div class="admin-workspace"><header class="admin-topbar">Agent Dashboard</header><main>${markup}</main></div></div>`
    : `<div class="pivot-app-shell"><aside class="pivot-sidebar"></aside><div class="pivot-app-body"><header class="pivot-app-header">Pivot Sols</header><main class="pivot-main">${markup}</main></div></div>`
  writeFileSync(join(temp,`${name}.html`),`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}</head><body>${content}</body></html>`)
}

const child = spawn(chrome,['--headless=new','--disable-gpu','--no-sandbox','--remote-debugging-port=9224','--remote-allow-origins=*',`--user-data-dir=${join(temp,'profile')}`,'about:blank'],{stdio:'ignore'})
let cdp
async function waitForChrome() {
  for(let i=0;i<80;i++) {
    try { const response=await fetch('http://127.0.0.1:9224/json/version'); if(response.ok)return }
    catch { /* browser still starting */ }
    await new Promise(done=>setTimeout(done,100))
  }
  throw new Error('Chrome debugging endpoint did not start')
}
async function connect(url) {
  const socket=new WebSocket(url)
  const pending=new Map();let nextId=1
  await new Promise((done,reject)=>{socket.addEventListener('open',done,{once:true});socket.addEventListener('error',reject,{once:true})})
  socket.addEventListener('message',event=>{const value=JSON.parse(event.data);if(!value.id)return;const waiter=pending.get(value.id);if(waiter){pending.delete(value.id);value.error?waiter.reject(new Error(value.error.message)):waiter.resolve(value.result)}})
  return {socket,send(method,params={}){const id=nextId++;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}}
}
try {
  await waitForChrome()
  const tab=await (await fetch('http://127.0.0.1:9224/json/new?about:blank',{method:'PUT'})).json()
  cdp=await connect(tab.webSocketDebuggerUrl)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  let failures=0
  for (const width of [375,768,1024,1440]) {
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===375})
    for (const [name] of pages) {
      await cdp.send('Page.navigate',{url:pathToFileURL(join(temp,`${name}.html`)).href})
      let result
      for(let attempt=0;attempt<30;attempt++) {
        result=await cdp.send('Runtime.evaluate',{expression:'document.readyState==="complete"?JSON.stringify({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}):null',returnByValue:true})
        if(result.result.value)break
        await new Promise(done=>setTimeout(done,50))
      }
      const values=JSON.parse(result.result.value)
      const pass=values.document<=values.viewport+1 && values.body<=values.viewport+1
      if(!pass)failures++
      console.log(`${pass?'PASS':'FAIL'} ${width} ${name}: viewport=${values.viewport} document=${values.document} body=${values.body}`)
    }
  }
  if(failures)process.exitCode=1
} finally {
  try { await cdp?.send('Browser.close') } catch { /* Chrome may already be closed */ }
  cdp?.socket.close()
  child.kill()
  await new Promise(done=>setTimeout(done,300))
  rmSync(temp,{recursive:true,force:true,maxRetries:10,retryDelay:200})
}
