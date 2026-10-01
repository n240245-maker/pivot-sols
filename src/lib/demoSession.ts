import type { StudentProfile, SupportedAcademicLevel } from '../types/student'
import { isValidPrototypeEmail, normalizeEmail } from './otpApi'
import type { VerifiedOtp } from './otpApi'

export interface DemoLoginDetails { name: string; studentId: string; year: SupportedAcademicLevel; email: string }
type StoredProfile = Pick<StudentProfile, 'name' | 'studentId' | 'academicLevel' | 'email' | 'campus'>
type DemoStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export const DEMO_SESSION_KEY = 'pivot-sols-demo-session'
export const DEMO_PROFILE_KEY = 'pivot-sols-demo-profile'
export const VERIFIED_SESSION_MARKER = 'email-verified-v2'
function browserStorage(): DemoStorage | undefined {
  try { return typeof window === 'undefined' ? undefined : window.localStorage } catch { return undefined }
}
function isStoredProfile(value: unknown): value is StoredProfile {
  if (!value || typeof value !== 'object') return false
  const p = value as Record<string, unknown>
  return typeof p.name === 'string' && Boolean(p.name.trim()) &&
    typeof p.studentId === 'string' && Boolean(p.studentId.trim()) &&
    (p.academicLevel === 'P1' || p.academicLevel === 'E1') && p.campus === 'Nuzvid' &&
    typeof p.email === 'string' && isValidPrototypeEmail(p.email)
}
function profileFromStored(p: StoredProfile): StudentProfile {
  return { id: 'demo-student', batch: 0, name: p.name, studentId: p.studentId,
    academicLevel: p.academicLevel, email: p.email, campus: 'Nuzvid' }
}
export function getDemoSession(storage: DemoStorage | undefined = browserStorage()): StudentProfile | null {
  try {
    // Fixed-code sessions never migrate into the verified-email flow.
    if (storage?.getItem(DEMO_SESSION_KEY) !== VERIFIED_SESSION_MARKER) return null
    const value: unknown = JSON.parse(storage.getItem(DEMO_PROFILE_KEY) ?? 'null')
    return isStoredProfile(value) ? profileFromStored(value) : null
  } catch { return null }
}
export function clearDemoSession(storage: DemoStorage | undefined = browserStorage()): void {
  if (!storage) return
  try { storage.removeItem(DEMO_SESSION_KEY) } finally { storage.removeItem(DEMO_PROFILE_KEY) }
}
// Called by DemoAuthProvider only after verifyOtp resolves with verified === true.
export function createDemoSession(details: DemoLoginDetails, verification: VerifiedOtp, storage: DemoStorage | undefined = browserStorage()): StudentProfile {
  if (verification?.success !== true || verification?.verified !== true) throw new Error('Verify your email before continuing.')
  if (!details.name.trim() || !details.studentId.trim() || !['P1', 'E1'].includes(details.year) || !isValidPrototypeEmail(details.email)) throw new Error('Enter your name, student ID, academic level and a valid email.')
  if (!storage) throw new Error('Enable local storage in this browser to keep your verified session.')
  const stored: StoredProfile = { name: details.name.trim(), studentId: details.studentId.trim(),
    academicLevel: details.year, email: normalizeEmail(details.email), campus: 'Nuzvid' }
  try {
    storage.setItem(DEMO_PROFILE_KEY, JSON.stringify(stored))
    storage.setItem(DEMO_SESSION_KEY, VERIFIED_SESSION_MARKER)
  } catch {
    try { clearDemoSession(storage) } catch { /* Never grant a session if storage fails. */ }
    throw new Error('Could not save the verified session. Enable local storage and request a new OTP.')
  }
  return profileFromStored(stored)
}
