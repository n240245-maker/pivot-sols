import { API_BASE_URL } from '../config/api'
import type { StudentProfile, SupportedAcademicLevel } from '../types/student'

export interface StudentLoginDetails { name: string; studentId: string; year: SupportedAcademicLevel }

export async function loginStudent(details: StudentLoginDetails): Promise<void> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST', credentials: 'include', cache: 'no-store', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'X-Pivot-Student': '1' },
      body: JSON.stringify({name: details.name.trim(), student_id: details.studentId.trim().toUpperCase(), academic_level: details.year}),
    })
    if (!response.ok) {
      if (response.status === 400) throw new Error('Enter a valid name, student ID and year.')
      if (response.status === 429) throw new Error('Too many sign-in attempts. Please try again later.')
      throw new Error('Unable to sign in. Please try again.')
    }
    const result: unknown = await response.json()
    if (!result || typeof result !== 'object' || !('success' in result) || result.success !== true)
      throw new Error('Unable to sign in. Please try again.')
  } catch (error) {
    if (error instanceof Error && ['Enter a valid name, student ID and year.','Too many sign-in attempts. Please try again later.','Unable to sign in. Please try again.'].includes(error.message)) throw error
    throw new Error('Unable to reach the student service. Please try again.')
  } finally { clearTimeout(timeout) }
}

export async function getStudentSession(): Promise<StudentProfile|null> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {credentials:'include',cache:'no-store'})
  if (response.status === 401) return null
  if (!response.ok) throw new Error('Unable to restore your student session. Please try again.')
  const result: unknown = await response.json()
  const profile = result && typeof result === 'object' && 'profile' in result ? result.profile : null
  if (!profile || typeof profile !== 'object') throw new Error('Student session data is unavailable.')
  const p = profile as Record<string, unknown>
  if (typeof p.id !== 'string' || typeof p.name !== 'string' || typeof p.studentId !== 'string' ||
      (p.academicLevel !== 'P1' && p.academicLevel !== 'E1') || p.campus !== 'Nuzvid' || typeof p.batch !== 'number')
    throw new Error('Student session data is unavailable.')
  return p as unknown as StudentProfile
}

export async function clearStudentServerSession(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {method:'POST',credentials:'include',cache:'no-store',headers:{'X-Pivot-Student':'1'}})
  if (!response.ok) throw new Error('Unable to log out. Please try again.')
}
