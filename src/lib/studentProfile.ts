import type { User } from '@supabase/supabase-js'
import type { StudentProfile } from '../types/student'
import { requireSupabase } from './supabase'
import { StudentAccessError } from './authErrors'
import { extractStudentIdFromEmail, getAcademicLevel, getBatchFromStudentId, isRguktEmail, isSupportedAcademicLevel, normalizeEmail, normalizeStudentId, STUDENT_MESSAGES, validateStudentId } from './studentValidation'

export function assertVerifiedStudent(user: User): void {
  if (!user.email || !isRguktEmail(user.email)) throw new StudentAccessError(STUDENT_MESSAGES.google)
  if (!user.email_confirmed_at) throw new StudentAccessError('Verify your RGUKT email before continuing to Pivot Sols.')
}
export function getStudentName(user: User): string {
  const name: unknown = user.user_metadata.full_name ?? user.user_metadata.name
  return typeof name === 'string' && name.trim().length >= 2 ? name.trim().slice(0, 100) : 'RGUKT student'
}

export function mapStudentProfile(row: Record<string, unknown>, user: User): StudentProfile {
  const studentId = typeof row.student_id === 'string' ? row.student_id : ''
  const batch = getBatchFromStudentId(studentId)
  const level = getAcademicLevel(batch)
  if (!isSupportedAcademicLevel(level)) throw new StudentAccessError(STUDENT_MESSAGES.unsupported)
  const emailId = extractStudentIdFromEmail(user.email ?? '')
  if (row.id !== user.id || row.email !== normalizeEmail(user.email ?? '') ||
    row.batch !== batch || row.academic_level !== level || row.campus !== 'Nuzvid' ||
    typeof row.name !== 'string' || row.name.trim().length < 2 ||
    (emailId !== null && emailId !== studentId)) {
    throw new StudentAccessError('Your student profile needs to be checked before you can continue. Please try again or contact the platform team.')
  }
  return { id: user.id, studentId, batch: batch!, academicLevel: level, name: row.name, email: row.email as string, campus: 'Nuzvid' }
}

// Coalesce StrictMode/auth-event overlap. The RPC also handles concurrent tabs
// atomically, so idempotency does not depend on this in-memory optimization.
const pendingProfiles = new Map<string, Promise<StudentProfile | null>>()

export function resolveStudentProfile(user: User, enteredId?: string): Promise<StudentProfile | null> {
  const key = `${user.id}:${enteredId ?? ''}`
  const existing = pendingProfiles.get(key)
  if (existing) return existing
  const task = resolve(user, enteredId).finally(() => pendingProfiles.delete(key))
  pendingProfiles.set(key, task)
  return task
}

async function resolve(user: User, enteredId?: string): Promise<StudentProfile | null> {
  assertVerifiedStudent(user)
  const client = requireSupabase()
  const { data: existing, error: readError } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (readError) throw readError
  if (existing) return mapStudentProfile(existing, user)

  const emailId = extractStudentIdFromEmail(user.email!)
  const manualId: unknown = user.app_metadata.provider === 'email' ? user.user_metadata.student_id : undefined
  const candidate = emailId ?? enteredId ?? (typeof manualId === 'string' ? manualId : undefined)
  if (!candidate) return null
  const validationError = validateStudentId(candidate, user.email)
  if (validationError) throw new StudentAccessError(validationError)

  const { data, error } = await client.rpc('ensure_student_profile', {
    p_student_id: normalizeStudentId(candidate),
    p_name: getStudentName(user),
  })
  if (error) throw error
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new StudentAccessError('Your profile could not be loaded. Please try again.')
  return mapStudentProfile(data, user)
}
