import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { loadTypeScript } from './load-typescript.mjs'

const v = loadTypeScript('src/lib/studentValidation.ts')
test('batch and academic-level detection use the configured two-year difference', () => {
  for (const [id, batch, level] of [['N260001',26,'P1'],['N240001',24,'E1'],['N250001',25,'UNSUPPORTED']]) {
    assert.equal(v.getBatchFromStudentId(id), batch)
    assert.equal(v.getAcademicLevel(batch), level)
  }
  assert.equal(v.getAcademicLevel(27, 27), 'P1')
  assert.equal(v.getAcademicLevel(25, 27), 'E1')
  assert.equal(v.getAcademicLevel(26, 27), 'UNSUPPORTED')
  assert.equal(v.normalizeStudentId(' n260001 '), 'N260001')
})
test('IDs reject malformed or longer identifiers', () => {
  for (const id of ['N26001','N2600011','N26AB01','240001','E240001','ABC123','']) {
    assert.equal(v.isValidStudentId(id), false, id)
    assert.equal(v.getBatchFromStudentId(id), null)
  }
})
test('email parsing is exact, case-insensitive and rejects malformed addresses', () => {
  for (const email of ['n260001@rguktn.ac.in',' N240001@RGUKTN.AC.IN ','student@rguktn.ac.in']) assert.equal(v.isRguktEmail(email), true, email)
  for (const email of ['abc@gmail.com','abc@rguktn.ac.in.fake.com','abc@rgukt.ac.in','a@@rguktn.ac.in','.a@rguktn.ac.in','a..b@rguktn.ac.in','a b@rguktn.ac.in','@rguktn.ac.in','a.@rguktn.ac.in']) assert.equal(v.isRguktEmail(email), false, email)
})
test('email ID extraction is conservative and rejects ambiguous or truncated IDs', () => {
  for (const email of ['n240001@rguktn.ac.in','N240001@RGUKTN.AC.IN','student.n240001@rguktn.ac.in','n240001+campus@rguktn.ac.in']) assert.equal(v.extractStudentIdFromEmail(email), 'N240001')
  for (const email of ['student@rguktn.ac.in','n2400011@rguktn.ac.in','an240001@rguktn.ac.in','n240001.n240002@rguktn.ac.in','n240001@gmail.com']) assert.equal(v.extractStudentIdFromEmail(email), null, email)
})
test('manual validation enforces name, password, batch and email-ID agreement', () => {
  const valid = { name:'Test Student',studentId:'n240001',email:'n240001@rguktn.ac.in',password:'test-password' }
  assert.equal(Object.keys(v.validateRegistration(valid)).length, 0)
  assert.equal(v.validateRegistration({...valid, email:'n240999@rguktn.ac.in'}).studentId, v.STUDENT_MESSAGES.mismatch)
  assert.equal(v.validateRegistration({...valid, studentId:'N250001'}).studentId, v.STUDENT_MESSAGES.unsupported)
  assert.ok(v.validateRegistration({...valid, name:' ',password:'short'}).name)
  assert.ok(v.validateRegistration({...valid, name:' ',password:'short'}).password)
  assert.equal(Object.keys(v.validateRegistration({...valid,email:'student@rguktn.ac.in'})).length, 0)
})
test('database cycle seed matches the central academic configuration', () => {
  const { CURRENT_P1_BATCH } = loadTypeScript('src/config/academic.ts')
  const sql = readFileSync('supabase/migrations/002_academic_cycle.sql','utf8')
  assert.ok(sql.includes(`values (true, ${CURRENT_P1_BATCH})`), 'Run npm run db:academic after changing the academic cycle')
})
