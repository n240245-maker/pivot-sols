import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { CONFIG_MESSAGE, StudentAccessError } from './authErrors'
import { DEMO_MODE } from '../config/demo'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

function isPublicKey(value: string): boolean {
  if (value.startsWith('sb_publishable_')) return true
  try {
    const encoded = value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(encoded)).role === 'anon'
  } catch { return false }
}
function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' ||
      (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))
  } catch { return false }
}

export const isSupabaseConfigured = Boolean(url && key && isValidUrl(url) && isPublicKey(key))
export const supabase: SupabaseClient | null = !DEMO_MODE && isSupabaseConfigured
  ? createClient(url!, key!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  })
  : null

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new StudentAccessError(CONFIG_MESSAGE)
  return supabase
}
export function authCallbackUrl(): string { return `${window.location.origin}/auth/callback` }
