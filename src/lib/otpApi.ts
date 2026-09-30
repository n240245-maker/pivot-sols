import { API_BASE_URL } from '../config/api'
import type { DemoLoginDetails } from './demoSession'
import type { StudentProfile } from '../types/student'

export interface VerifiedOtp { success: true; verified: true }
const messages: Record<string, string> = {
  invalid_request: 'Enter a valid email and a six-digit verification code.',
  invalid_otp: 'The verification code is incorrect.',
  expired_otp: 'This verification code has expired. Request a new one.',
  attempts_exceeded: 'Too many incorrect attempts. Request a new OTP.',
  resend_cooldown: 'Please wait before requesting another OTP.',
  rate_limited: 'Too many OTP requests. Please try again later.',
  delivery_failed: "We couldn't send your verification code. Please try again.",
}
export class OtpApiError extends Error {
  constructor(public readonly code: string, public readonly retryAfter = 0) {
    super(messages[code] ?? 'Unable to reach the verification service. Please try again.')
    this.name = 'OtpApiError'
  }
}
export function normalizeEmail(email: string): string { return email.trim().toLowerCase() }
export function isValidPrototypeEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}
async function request(path: string, body: { email: string; otp?: string; name?: string; student_id?: string; academic_level?: 'P1'|'E1' }): Promise<Record<string, unknown>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, email: normalizeEmail(body.email) }),
      signal: controller.signal, cache: 'no-store', credentials: path === 'verify-otp' ? 'include' : 'omit',
    })
    const value: unknown = await response.json()
    const data = value && typeof value === 'object' ? value as Record<string, unknown> : {}
    if (!response.ok) {
      const code = typeof data.code === 'string' && data.code in messages ? data.code : response.status === 503 ? 'delivery_failed' : 'service_unavailable'
      const retryAfter = typeof data.retry_after === 'number' && Number.isFinite(data.retry_after) ? Math.max(0, Math.ceil(data.retry_after)) : 0
      throw new OtpApiError(code, retryAfter)
    }
    if (data.success !== true) throw new OtpApiError('service_unavailable')
    return data
  } catch (error) {
    if (error instanceof OtpApiError) throw error
    throw new OtpApiError('service_unavailable')
  } finally { clearTimeout(timeout) }
}
export async function sendOtp(email: string): Promise<void> { await request('send-otp', { email }) }
export async function verifyOtp(email: string, otp: string, details?: DemoLoginDetails): Promise<VerifiedOtp> {
  if (!/^[0-9]{6}$/.test(otp)) throw new OtpApiError('invalid_request')
  const result = await request('verify-otp', { email, otp, ...(details?{name:details.name.trim(),student_id:details.studentId.trim(),academic_level:details.year}:{}) })
  if (result.verified !== true) throw new OtpApiError('service_unavailable')
  return { success: true, verified: true }
}
export async function getStudentSession(): Promise<StudentProfile|null> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {credentials:'include',cache:'no-store'})
  if (response.status===401) return null
  if (!response.ok) throw new Error('Unable to restore your student session. Please try again.')
  const result:unknown=await response.json()
  const profile=result&&typeof result==='object'&&'profile' in result?result.profile:null
  if (!profile||typeof profile!=='object') throw new Error('Student session data is unavailable.')
  const p=profile as Record<string,unknown>
  if (typeof p.id!=='string'||typeof p.name!=='string'||typeof p.studentId!=='string'||typeof p.email!=='string'||
      (p.academicLevel!=='P1'&&p.academicLevel!=='E1')||p.campus!=='Nuzvid'||typeof p.batch!=='number')
    throw new Error('Student session data is unavailable.')
  return p as unknown as StudentProfile
}
export async function clearStudentServerSession(): Promise<void> {
  const response=await fetch(`${API_BASE_URL}/api/auth/logout`, {method:'POST',credentials:'include',cache:'no-store',headers:{'X-Pivot-Student':'1'}})
  if (!response.ok) throw new Error('Unable to log out. Please try again.')
}
