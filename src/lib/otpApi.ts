import { API_BASE_URL } from '../config/api'

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
async function request(path: string, body: { email: string; otp?: string }): Promise<Record<string, unknown>> {
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
export async function verifyOtp(email: string, otp: string): Promise<VerifiedOtp> {
  if (!/^[0-9]{6}$/.test(otp)) throw new OtpApiError('invalid_request')
  const result = await request('verify-otp', { email, otp })
  if (result.verified !== true) throw new OtpApiError('service_unavailable')
  return { success: true, verified: true }
}
export async function clearStudentServerSession(): Promise<void> {
  try { await fetch(`${API_BASE_URL}/api/auth/logout`, {method:'POST',credentials:'include',cache:'no-store',headers:{'X-Pivot-Student':'1'}}) } catch { /* Local logout always completes. */ }
}
