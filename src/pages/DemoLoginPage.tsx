import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Logo } from '../components/Logo'
import { InputGroup } from '../components/auth/InputGroup'
import { AgentLoginLink } from '../components/auth/AgentLoginLink'
import { useAuth } from '../contexts/AuthContext'
import { DEMO_MODE } from '../config/demo'
import type { StudentLoginDetails } from '../lib/studentSessionApi'

type FieldErrors = Partial<Record<keyof StudentLoginDetails, string>>

export function DemoLoginPage() {
  const [details, setDetails] = useState<StudentLoginDetails>({ name: '', studentId: '', year: 'P1' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const auth = useAuth()
  const navigate = useNavigate()
  if (!DEMO_MODE) return <Navigate to="/login" replace />

  const update = (field: keyof StudentLoginDetails, value: string) => {
    setDetails(previous => ({ ...previous, [field]: value }))
    setErrors(previous => ({ ...previous, [field]: undefined }))
    setError('')
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending.current) return
    const name = details.name.trim().replace(/\s+/g, ' ')
    const studentId = details.studentId.trim().toUpperCase()
    const next: FieldErrors = {
      name: name.length >= 2 && [...name].some(character => /\p{L}/u.test(character)) ? undefined : 'Enter your name.',
      studentId: studentId.length >= 2 && studentId.length <= 40 && /^[A-Z0-9]+$/.test(studentId) ? undefined : 'Enter a valid ID number.',
      year: details.year === 'P1' || details.year === 'E1' ? undefined : 'Choose P1 or E1.',
    }
    setErrors(next); setError('')
    if (Object.values(next).some(Boolean)) return
    pending.current = true; setBusy(true)
    try {
      if (!auth.completeDemoLogin) throw new Error('Student sign-in is unavailable.')
      await auth.completeDemoLogin({ ...details, name, studentId })
      navigate('/dashboard', { replace: true })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Please try again.') }
    finally { pending.current = false; setBusy(false) }
  }

  return <div className="demo-login-layout">
    <a className="skip-link" href="#demo-form">Skip to form</a>
    <header><Logo /></header>
    <main id="demo-form" className="demo-login-card">
      <Link to="/" className="auth-back"><ArrowLeft size={14} aria-hidden="true" />Back to home</Link>
      <h1>Welcome to Pivot Sols</h1>
      <p className="auth-subtitle">Enter your details to continue.</p>
      <form className="auth-form" noValidate onSubmit={submit} aria-busy={busy}>
        <InputGroup id="demo-name" label="Student Name" autoComplete="name" placeholder="Your name" value={details.name} onChange={event => update('name', event.target.value)} disabled={busy} required error={errors.name} />
        <InputGroup id="demo-student-id" label="ID Number" autoComplete="off" placeholder="Your ID number" value={details.studentId} onChange={event => update('studentId', event.target.value)} disabled={busy} required error={errors.studentId} />
        <fieldset className="demo-year" disabled={busy}><legend>Year</legend>{(['P1', 'E1'] as const).map(level => <label key={level} className={details.year === level ? 'selected' : ''}><input type="radio" name="year" value={level} checked={details.year === level} onChange={() => update('year', level)} />{level}</label>)}</fieldset>
        {errors.year && <p role="alert" className="field-error">{errors.year}</p>}
        {error && <p className="field-error" role="alert">{error}</p>}
        <button type="submit" className="auth-button auth-submit" disabled={busy}>{busy ? 'Continuing...' : 'Continue'}<ArrowRight size={17} aria-hidden="true" /></button>
      </form>
      <AgentLoginLink />
    </main><footer>P1 &amp; E1 students <span>·</span> RGUKT Nuzvid</footer>
  </div>
}
