import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'

test('PostgreSQL profile migration and RLS enforce the student boundary', async (t) => {
  const db=new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role supabase_auth_admin;
    create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, is_anonymous boolean default false);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
  `)
  await db.exec(readFileSync('supabase/migrations/001_student_profiles.sql','utf8'))
  await db.exec(readFileSync('supabase/migrations/002_academic_cycle.sql','utf8'))
  const ids=Array.from({length:8},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)
  const emails=['n260001@rguktn.ac.in','n240001@rguktn.ac.in','n250001@rguktn.ac.in','test@gmail.com','n260002@rguktn.ac.in','first@rguktn.ac.in','second@rguktn.ac.in','n240002@rguktn.ac.in']
  for(let i=0;i<ids.length;i++) await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,$3)',[ids[i],emails[i],i===4?null:'2026-09-14T00:00:00Z'])
  async function asStudent(index,sql,params=[]){
    await db.exec('begin; set local role authenticated;')
    try {
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[ids[index]])
      const result=await db.query(sql,params)
      await db.exec('commit')
      return result.rows
    } catch(error){await db.exec('rollback');throw error}
  }
  const create=(index,id)=>asStudent(index,'select public.ensure_student_profile($1,$2) as profile',[id,'Test Student'])
  try {
    await t.test('creates P1/E1 and retries idempotently',async()=>{
      assert.equal((await create(0,'n260001'))[0].profile.academic_level,'P1')
      assert.equal((await create(1,'N240001'))[0].profile.academic_level,'E1')
      await create(0,'N260001')
      assert.equal((await db.query('select count(*)::int as count from public.profiles')).rows[0].count,2)
    })
    await t.test('RLS reads and updates only the current student',async()=>{
      const rows=await asStudent(0,'select * from public.profiles')
      assert.equal(rows.length,1); assert.equal(rows[0].id,ids[0])
      const other=await asStudent(0,'update public.profiles set name=$1 where id=$2 returning id',['Changed Name',ids[1]])
      assert.equal(other.length,0)
      assert.equal((await asStudent(0,"update public.profiles set name='Updated Student' where id=auth.uid() returning name"))[0].name,'Updated Student')
    })
    await t.test('actual Auth email and confirmation are required',async()=>{
      await assert.rejects(create(3,'N260003'))
      await assert.rejects(create(4,'N260002'))
      assert.equal((await asStudent(3,'select * from public.profiles')).length,0)
    })
    await t.test('rejects unsupported, malformed and mismatched IDs',async()=>{
      await assert.rejects(create(2,'N250001'))
      await assert.rejects(create(7,'N240099'))
      await assert.rejects(create(7,'N2400021'))
    })
    await t.test('derives protected fields and prevents ID reassignment',async()=>{
      const row=(await asStudent(0,"update public.profiles set batch=24,academic_level='E1',email='fake@rguktn.ac.in',campus='Other' where id=auth.uid() returning *"))[0]
      assert.equal(row.batch,26); assert.equal(row.academic_level,'P1'); assert.equal(row.email,emails[0]); assert.equal(row.campus,'Nuzvid')
      await assert.rejects(asStudent(0,"update public.profiles set student_id='N260099' where id=auth.uid()"))
      await assert.rejects(asStudent(0,'insert into public.profiles(id,student_id,name,email,batch,academic_level) values($1,$2,$3,$4,26,$5)',[ids[7],'N240002','Test Student',emails[7],'P1']))
    })
    await t.test('unique student ID prevents two generic-email accounts claiming it',async()=>{
      await create(5,'N260090')
      await assert.rejects(create(6,'N260090'))
    })
    await t.test('anonymous clients have no profile or provisioning access',async()=>{
      await db.exec('set role anon')
      await assert.rejects(db.query('select * from public.profiles'))
      await assert.rejects(db.query("select public.ensure_student_profile('N260001','Test Student')"))
      await db.exec('reset role')
    })
    await t.test('signup hook blocks foreign domains and other providers',async()=>{
      await db.exec('set role supabase_auth_admin')
      for(const [email,provider,allowed] of [['n260001@rguktn.ac.in','google',true],['test@gmail.com','google',false],['test@rguktn.ac.in.fake.com','email',false],['test@rguktn.ac.in','github',false]]){
        const result=await db.query('select public.hook_restrict_rgukt_signup($1::jsonb) as result',[JSON.stringify({user:{email,app_metadata:{provider}}})])
        assert.equal(!result.rows[0].result.error,allowed)
      }
      await db.exec('reset role')
    })
    await t.test('academic rollover revokes access for unsupported prior profiles',async()=>{
      await db.exec('update public.academic_config set current_p1_batch=27')
      assert.equal((await asStudent(0,'select * from public.profiles')).length,0)
      await assert.rejects(create(0,'N260001'))
      await db.exec('update public.academic_config set current_p1_batch=26')
    })
  } finally { await db.close() }
})
