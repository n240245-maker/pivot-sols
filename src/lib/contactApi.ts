import { API_BASE_URL } from '../config/api'

function isValidContactEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export interface ContactMessage { name: string; email: string; message: string }
export function validateContact(body: ContactMessage): string | undefined {
  if (body.name.trim().length < 2 || body.name.trim().length > 100 || /[\u0000-\u001f\u007f]/.test(body.name)) return 'Enter a name between 2 and 100 characters.'
  if (!isValidContactEmail(body.email)) return 'Enter a valid email address.'
  if (body.message.trim().length < 10 || body.message.trim().length > 3000) return 'Enter a message between 10 and 3000 characters.'
  return undefined
}
export async function sendContactMessage(body: ContactMessage): Promise<void> {
  const validation = validateContact(body)
  if (validation) throw new Error(validation)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  const failure = "We couldn't send your message. Please try again."
  try {
    const response = await fetch(`${API_BASE_URL}/api/contact`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:body.name.trim(),email:body.email.trim().toLowerCase(),message:body.message.trim()}),signal:controller.signal,credentials:'omit',cache:'no-store'})
    if (response.status === 429) throw new Error('Too many messages. Please try again later.')
    const value:unknown = await response.json()
    if (!response.ok || !value || typeof value !== 'object' || !('success' in value) || value.success !== true) throw new Error(failure)
  } catch (error) {
    if (error instanceof Error && error.message === 'Too many messages. Please try again later.') throw error
    throw new Error(failure)
  } finally { clearTimeout(timeout) }
}
