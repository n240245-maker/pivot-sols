import assert from 'node:assert/strict'
import test from 'node:test'
import { loadTypeScript } from './load-typescript.mjs'

function setup({email='n240001@rguktn.ac.in', confirmed=true, existing=null, provider='google', metadata={full_name:'Test Student'}}={}) {
  let writes=0
  const user={id:'test-user',email,email_confirmed_at:confirmed?'2026-09-14':null,app_metadata:{provider},user_metadata:metadata}
  const profile={id:user.id,student_id:'N240001',name:'Test Student',email,batch:24,academic_level:'E1',campus:'Nuzvid'}
  const client={
    from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:existing,error:null})})})}),
    rpc:async(_name,args)=>{writes++; return {data:{...profile,student_id:args.p_student_id},error:null}},
  }
  const module=loadTypeScript('src/lib/studentProfile.ts',{'./supabase':{requireSupabase:()=>client}})
  return {...module,user,profile,writes:()=>writes}
}
test('verified Google ID auto-provisions once across overlapping auth events', async()=>{
  const s=setup()
  const results=await Promise.all([s.resolveStudentProfile(s.user),s.resolveStudentProfile(s.user)])
  assert.equal(s.writes(),1)
  assert.equal(results[0].academicLevel,'E1')
  assert.equal(results[0].studentId,'N240001')
})
test('Google fallback waits for ID and preserves the Google identity',async()=>{
  const s=setup({email:'student@rguktn.ac.in'})
  assert.equal(await s.resolveStudentProfile(s.user),null)
  assert.equal(s.writes(),0)
  assert.equal((await s.resolveStudentProfile(s.user,'N240001')).name,'Test Student')
})
test('manual confirmed signup recovers the registration ID from metadata',async()=>{
  const s=setup({email:'student@rguktn.ac.in',provider:'email',metadata:{full_name:'Test Student',student_id:'n240001'}})
  assert.equal((await s.resolveStudentProfile(s.user)).studentId,'N240001')
})
test('unconfirmed, non-institutional and unsupported users cannot provision',async()=>{
  for(const options of [{confirmed:false},{email:'student@gmail.com'},{email:'n250001@rguktn.ac.in'}]){
    const s=setup(options)
    await assert.rejects(s.resolveStudentProfile(s.user))
    assert.equal(s.writes(),0)
  }
})
test('existing profiles cannot spoof another identity or academic level',()=>{
  const s=setup()
  assert.throws(()=>s.mapStudentProfile({...s.profile,id:'another-user'},s.user))
  assert.throws(()=>s.mapStudentProfile({...s.profile,academic_level:'P1'},s.user))
  assert.throws(()=>s.mapStudentProfile({...s.profile,email:'someone@rguktn.ac.in'},s.user))
})
