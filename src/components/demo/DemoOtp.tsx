import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { InputGroup } from '../auth/InputGroup'
import { useOtpCountdown } from '../../hooks/useOtpCountdown'

interface OtpProps {
  email: string
  cooldownDeadline: number
  onVerify: (otp: string) => Promise<void>
  onResend: () => Promise<void>
  onBack: () => void
}
export function DemoOtp({ email, cooldownDeadline, onVerify, onResend, onBack }: OtpProps) {
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState<'verify' | 'resend' | null>(null)
  const pending = useRef(false)
  const seconds = useOtpCountdown(cooldownDeadline)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending.current) return
    setError(''); setNotice('')
    if (!/^[0-9]{6}$/.test(otp)) { setError('Enter the six-digit verification code.'); return }
    pending.current = true; setBusy('verify')
    try { await onVerify(otp) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Please try again.') }
    finally { pending.current = false; setBusy(null) }
  }
  const resend = async () => {
    if (pending.current || seconds > 0) return
    pending.current = true; setBusy('resend'); setError(''); setNotice(''); setOtp('')
    try { await onResend(); setNotice('A new verification code has been sent.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Please try again.') }
    finally { pending.current = false; setBusy(null) }
  }
  return <>
    <p className="auth-kicker">Prototype · Step 2 of 2</p><h1>Verify OTP</h1>
    <p className="auth-subtitle">We've sent a 6-digit verification code to:<strong className="otp-recipient">{email}</strong></p>
    <form className="auth-form" noValidate onSubmit={submit} aria-busy={busy !== null}>
      <InputGroup id="demo-otp" label="Verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" placeholder="000000" autoFocus value={otp} onChange={e => { setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6)); setError('') }} disabled={busy !== null} error={error} required />
      <p className="field-hint">This code expires in 5 minutes.</p>
      <button type="submit" className="auth-button auth-submit" disabled={busy !== null}>{busy === 'verify' ? 'Verifying...' : 'Verify OTP'}<ArrowRight size={17} aria-hidden="true" /></button>
    </form>
    <div className="otp-actions"><button type="button" className="auth-text-button" disabled={busy !== null || seconds > 0} onClick={resend}>{busy === 'resend' ? 'Sending...' : seconds > 0 ? `Resend OTP in ${seconds}s` : 'Resend OTP'}</button><button type="button" className="auth-text-button" disabled={busy !== null} onClick={onBack}>Change email</button></div>
    {notice && <p role="status" className="otp-notice">{notice}</p>}
  </>
}
