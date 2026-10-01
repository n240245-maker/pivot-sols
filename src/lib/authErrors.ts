export const CONFIG_MESSAGE = 'Account services are not available yet. Please try again later.'

export class StudentAccessError extends Error {}

export function friendlyAuthError(error: unknown): string {
  if (error instanceof StudentAccessError) return error.message
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  const messages: Record<string, string> = {
    invalid_credentials: 'Your email or password is incorrect. Please try again.',
    email_not_confirmed: 'Verify your RGUKT email before logging in. Check your inbox for the verification link.',
    user_already_exists: 'An account already exists for this email. Try logging in instead.',
    email_exists: 'An account already exists for this email. Try logging in instead.',
    weak_password: 'Choose a stronger password with at least 8 characters.',
    over_email_send_rate_limit: 'Please wait a minute before requesting another email.',
    over_request_rate_limit: 'Too many attempts. Please wait a moment and try again.',
    signup_disabled: 'New accounts are temporarily unavailable. Please try again later.',
    '23505': 'This RGUKT ID or email is already linked to an account. Try logging in instead.',
    'P0001': 'We could not verify your student profile. Check your RGUKT ID and try again.',
  }
  return messages[code] ?? 'We could not complete that request. Please try again in a moment.'
}

export function debugAuthError(operation: string, error: unknown) {
  // Never log credentials, tokens, emails, or the raw response payload.
  if (import.meta.env.DEV) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : 'unknown'
    console.debug(`[Pivot Sols] ${operation} failed`, { code })
  }
}
