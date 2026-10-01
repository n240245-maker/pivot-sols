import { CURRENT_P1_BATCH } from '../config/academic'
import type { AcademicLevel, RegistrationErrors, RegistrationValues, SupportedAcademicLevel } from '../types/student'

export const STUDENT_MESSAGES = {
  email: 'Use your RGUKT Nuzvid email ending in @rguktn.ac.in.',
  id: 'Enter a valid RGUKT ID such as N240001.',
  unsupported: 'Pivot Sols currently supports P1 and E1 students only.',
  mismatch: 'The RGUKT ID in your email does not match the ID you entered.',
  google: 'Please sign in using your RGUKT Nuzvid Google account.',
} as const

export function normalizeStudentId(value: string): string { return value.trim().toUpperCase() }
export function normalizeEmail(value: string): string { return value.trim().toLowerCase() }
export function isValidStudentId(value: string): boolean { return /^N\d{6}$/.test(normalizeStudentId(value)) }
export function getBatchFromStudentId(value: string): number | null {
  return isValidStudentId(value) ? Number(normalizeStudentId(value).slice(1, 3)) : null
}
export function getAcademicLevel(batch: number | null, currentP1Batch = CURRENT_P1_BATCH): AcademicLevel {
  if (batch === currentP1Batch) return 'P1'
  if (batch === currentP1Batch - 2) return 'E1'
  return 'UNSUPPORTED'
}
export function isSupportedAcademicLevel(level: AcademicLevel): level is SupportedAcademicLevel {
  return level === 'P1' || level === 'E1'
}
export function isRguktEmail(value: string): boolean {
  const email = normalizeEmail(value)
  const parts = email.split('@')
  if (parts.length !== 2 || parts[1] !== 'rguktn.ac.in' || email.length > 254) return false
  const local = parts[0]
  return local.length > 0 && local.length <= 64 &&
    /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local) &&
    !local.startsWith('.') && !local.endsWith('.') && !local.includes('..')
}
export function extractStudentIdFromEmail(value: string): string | null {
  if (!isRguktEmail(value)) return null
  // Only isolated, unambiguous IDs; do not truncate a longer number or guess
  // between multiple IDs. A dot/underscore/plus-delimited local part is supported.
  const matches = [...normalizeEmail(value).split('@')[0].matchAll(/(?:^|[^a-z0-9])(n\d{6})(?=$|[^a-z0-9])/g)]
  return matches.length === 1 ? normalizeStudentId(matches[0][1]) : null
}
export function validateStudentId(value: string, email?: string): string | undefined {
  if (!isValidStudentId(value)) return STUDENT_MESSAGES.id
  if (!isSupportedAcademicLevel(getAcademicLevel(getBatchFromStudentId(value)))) return STUDENT_MESSAGES.unsupported
  const emailId = email ? extractStudentIdFromEmail(email) : null
  if (emailId && emailId !== normalizeStudentId(value)) return STUDENT_MESSAGES.mismatch
}
export function validateRegistration(values: RegistrationValues): RegistrationErrors {
  const errors: RegistrationErrors = {}
  if (values.name.trim().length < 2 || values.name.trim().length > 100) errors.name = 'Enter your name using 2 to 100 characters.'
  const idError = validateStudentId(values.studentId, values.email)
  if (idError) errors.studentId = idError
  if (!isRguktEmail(values.email)) errors.email = STUDENT_MESSAGES.email
  if (values.password.length < 8) errors.password = 'Use a password with at least 8 characters.'
  return errors
}
