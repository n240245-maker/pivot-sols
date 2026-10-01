import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { AuthLayout } from '../components/auth/AuthLayout'
import { AgentLoginLink } from '../components/auth/AgentLoginLink'
import { InputGroup } from '../components/auth/InputGroup'
import { DetectedYear } from '../components/auth/DetectedYear'
import { GoogleButton } from '../components/auth/GoogleButton'
import { AuthNotice } from '../components/auth/AuthNotice'
import { VerificationNotice } from '../components/auth/VerificationNotice'
import { useAuthAction } from '../components/auth/useAuthAction'
import { normalizeEmail, normalizeStudentId, validateRegistration } from '../lib/studentValidation'
import type { RegistrationErrors, RegistrationValues } from '../types/student'

export function SignupPage() {
  const auth = useAuth()
  const action = useAuthAction()
  const [values, setValues] = useState<RegistrationValues>({ name: '', studentId: '', email: '', password: '' })
  const [errors, setErrors] = useState<RegistrationErrors>({})
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null)
  const update = (field: keyof RegistrationValues, value: string) => {
    setValues((old) => ({ ...old, [field]: value }))
    setErrors((old) => ({ ...old, [field]: undefined }))
    action.setError(null)
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateRegistration(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      event.currentTarget.querySelector<HTMLInputElement>(`[name="${Object.keys(nextErrors)[0]}"]`)?.focus()
      return
    }
    void action.run(async () => {
      const result = await auth.signUp(values)
      setValues((old) => ({ ...old, password: '' }))
      if (result.verificationRequired) setVerificationEmail(normalizeEmail(values.email))
    })
  }
  return <AuthLayout>
    {verificationEmail ? <VerificationNotice email={verificationEmail} /> : <>
      <p className="auth-kicker">Your next chapter starts here</p>
      <h1>Create your<br className="auth-title-break" /> Pivot Sols account</h1>
      <p className="auth-subtitle">Use your RGUKT credentials to get started.</p>
      <AuthNotice error={action.error ?? auth.error} />
      <form className="auth-form" noValidate onSubmit={submit} aria-busy={Boolean(action.busy)}>
        <InputGroup id="signup-name" name="name" label="Name" placeholder="Your full name" autoComplete="name" maxLength={100} required value={values.name} onChange={(e) => update('name', e.target.value)} error={errors.name} />
        <InputGroup id="signup-id" name="studentId" label="RGUKT ID" placeholder="N240001" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={16} required value={values.studentId} onChange={(e) => update('studentId', e.target.value)} onBlur={() => setValues((old) => ({ ...old, studentId: normalizeStudentId(old.studentId) }))} error={errors.studentId} />
        <InputGroup id="signup-email" name="email" type="email" label="RGUKT Email" placeholder="Your ID@rguktn.ac.in" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} required value={values.email} onChange={(e) => update('email', e.target.value)} error={errors.email} />
        <InputGroup id="signup-password" name="password" type="password" label="Password" placeholder="Create a password" autoComplete="new-password" required value={values.password} onChange={(e) => update('password', e.target.value)} hint="Minimum 8 characters" error={errors.password} />
        <DetectedYear studentId={values.studentId} />
        <button className="auth-button auth-submit" type="submit" disabled={Boolean(action.busy)}>{action.busy === 'form' ? 'Creating account...' : 'Create Account'}<ArrowUpRight size={17} aria-hidden="true" /></button>
      </form>
      <div className="auth-divider"><span>OR</span></div>
      <GoogleButton disabled={Boolean(action.busy) || !auth.configured} loading={action.busy === 'google'} onClick={() => void action.run(auth.googleSignIn, 'google')} />
      <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
    </>}
    <AgentLoginLink />
  </AuthLayout>
}
