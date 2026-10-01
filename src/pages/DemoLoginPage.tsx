import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Logo } from '../components/Logo'
import { InputGroup } from '../components/auth/InputGroup'
import { AgentLoginLink } from '../components/auth/AgentLoginLink'
import { DemoOtp } from '../components/demo/DemoOtp'
import { useAuth } from '../contexts/AuthContext'
import { DEMO_MODE } from '../config/demo'
import { isValidPrototypeEmail, normalizeEmail, OtpApiError, sendOtp } from '../lib/otpApi'
import { useOtpCountdown } from '../hooks/useOtpCountdown'
import type { DemoLoginDetails } from '../lib/demoSession'

type FieldErrors = Partial<Record<keyof DemoLoginDetails, string>>
export function DemoLoginPage() {
  const [details, setDetails] = useState<DemoLoginDetails>({ name: '', studentId: '', year: 'P1', email: '' })
  const [step, setStep] = useState<'details' | 'otp'>('details')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState({ email: '', deadline: 0, sent: false })
  const pending = useRef(false)
  const seconds = useOtpCountdown(cooldown.email === normalizeEmail(details.email) ? cooldown.deadline : 0)
  const auth = useAuth()
  const navigate = useNavigate()
  if (!DEMO_MODE) return <Navigate to="/login" replace />
  const update = (field: keyof DemoLoginDetails, value: string) => {
    setDetails(previous => ({ ...previous, [field]: value }))
    setErrors(previous => ({ ...previous, [field]: undefined })); setError('')
  }
  const requestCode = async () => {
    try {
      await sendOtp(details.email)
      setCooldown({ email: normalizeEmail(details.email), deadline: Date.now() + 60_000, sent: true })
    } catch (reason) {
      if (reason instanceof OtpApiError && reason.retryAfter) setCooldown(previous => ({ email: normalizeEmail(details.email), deadline: Date.now() + reason.retryAfter * 1000, sent: previous.email === normalizeEmail(details.email) && previous.sent }))
      throw reason
    }
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending.current || seconds > 0) return
    const next: FieldErrors = {
      name: details.name.trim() ? undefined : 'Enter your name.',
      studentId: details.studentId.trim() ? undefined : 'Enter your student ID.',
      year: ['P1', 'E1'].includes(details.year) ? undefined : 'Choose P1 or E1.',
      email: isValidPrototypeEmail(details.email) ? undefined : 'Enter a valid email address.',
    }
    setErrors(next); setError('')
    if (Object.values(next).some(Boolean)) return
    pending.current = true; setSending(true)
    try { await requestCode(); setStep('otp') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Please try again.') }
    finally { pending.current = false; setSending(false) }
  }
  return <div className="demo-login-layout">
    <a className="skip-link" href="#demo-form">Skip to form</a>
    <header><Logo /><span className="demo-mode-badge">Email verification</span></header>
    <main id="demo-form" className="demo-login-card">
      <Link to="/" className="auth-back"><ArrowLeft size={14} aria-hidden="true" />Back to home</Link>
      {step === 'otp' ? <DemoOtp email={normalizeEmail(details.email)} cooldownDeadline={cooldown.deadline}
        onResend={requestCode} onBack={() => setStep('details')} onVerify={async otp => {
          if (!auth.completeDemoLogin) throw new Error('Email verification is unavailable.')
          await auth.completeDemoLogin(details, otp)
          navigate('/dashboard', { replace: true })
        }} /> : <>
        <p className="auth-kicker">Prototype · Step 1 of 2</p><h1>Your next step<br />starts here.</h1>
        <p className="auth-subtitle">Enter your details. We'll send a code to verify your email.</p>
        <form className="auth-form" noValidate onSubmit={submit} aria-busy={sending}>
          <InputGroup id="demo-name" label="Name" autoComplete="name" placeholder="Your name" value={details.name} onChange={e => update('name', e.target.value)} disabled={sending} required error={errors.name} />
          <InputGroup id="demo-student-id" label="Student ID" autoComplete="off" placeholder="Your student ID" value={details.studentId} onChange={e => update('studentId', e.target.value)} disabled={sending} required error={errors.studentId} />
          <fieldset className="demo-year" disabled={sending}><legend>Academic Level</legend>{(['P1', 'E1'] as const).map(level => <label key={level} className={details.year === level ? 'selected' : ''}><input type="radio" name="year" value={level} checked={details.year === level} onChange={() => update('year', level)} />{level}</label>)}</fieldset>
          {errors.year && <p role="alert" className="field-error">{errors.year}</p>}
          <InputGroup id="demo-email" label="Email" type="email" autoComplete="email" placeholder="student@example.com" value={details.email} onChange={e => update('email', e.target.value)} disabled={sending} required error={errors.email} />
          {error && <p className="otp-feedback" role="alert">{error}</p>}
          <button type="submit" className="auth-button auth-submit" disabled={sending || seconds > 0}>{sending ? 'Sending OTP...' : seconds > 0 ? `Send OTP in ${seconds}s` : 'Send OTP'}<ArrowRight size={17} aria-hidden="true" /></button>
          {seconds > 0 && cooldown.sent && <button type="button" className="auth-text-button" onClick={() => setStep('otp')}>Already have a code? Enter OTP</button>}
        </form><p className="demo-login-note">Use an email you can access. Any valid email is welcome for this prototype.</p>
      </>}
      <AgentLoginLink />
    </main><footer>P1 &amp; E1 students <span>·</span> RGUKT Nuzvid</footer>
  </div>
}
