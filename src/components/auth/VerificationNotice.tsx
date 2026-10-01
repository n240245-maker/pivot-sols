import { useEffect, useState } from 'react'
import { MailCheck } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '../../contexts/AuthContext'
import { useAuthAction } from './useAuthAction'
import { AuthNotice } from './AuthNotice'

export function VerificationNotice({ email }: { email: string }) {
  const { resendVerification } = useAuth()
  const { busy, error, run } = useAuthAction()
  const [cooldown, setCooldown] = useState(60)
  const [resent, setResent] = useState(false)
  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])
  return <div className="verification-state">
    <span className="auth-state-icon"><MailCheck size={27} strokeWidth={1.5} /></span>
    <h1>Verify your RGUKT email</h1>
    <p>We've sent a verification link to:</p>
    <strong className="verification-email">{email}</strong>
    <p>Verify your email before continuing to Pivot Sols.</p>
    <AuthNotice error={error} />
    {resent && <p role="status" className="field-hint">A new verification link has been requested. Please check your inbox.</p>}
    <Link to="/login" className="auth-button auth-submit">Back to login</Link>
    <button type="button" className="auth-text-button" disabled={Boolean(busy) || cooldown > 0} onClick={() => void run(async () => { await resendVerification(email); setResent(true); setCooldown(60) })}>{busy ? 'Sending verification...' : cooldown > 0 ? `Resend verification in ${cooldown}s` : 'Resend verification'}</button>
  </div>
}
