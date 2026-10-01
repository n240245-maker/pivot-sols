import { AlertCircle } from 'lucide-react'
import { CONFIG_MESSAGE } from '../../lib/authErrors'
import { useAuth } from '../../contexts/AuthContext'

export function AuthNotice({ error }: { error?: string | null }) {
  const { configured } = useAuth()
  const message = error || (!configured ? CONFIG_MESSAGE : null)
  if (!message) return null
  return <div className="auth-notice" role={error ? 'alert' : 'status'}><AlertCircle size={17} aria-hidden="true" /><p>{message}</p></div>
}
