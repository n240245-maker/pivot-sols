import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { AuthLayout } from '../components/auth/AuthLayout'
import { AgentLoginLink } from '../components/auth/AgentLoginLink'
import { AuthNotice } from '../components/auth/AuthNotice'
import { InputGroup } from '../components/auth/InputGroup'
import { GoogleButton } from '../components/auth/GoogleButton'
import { useAuthAction } from '../components/auth/useAuthAction'
import { isRguktEmail, STUDENT_MESSAGES } from '../lib/studentValidation'

export function LoginPage() {
  const auth = useAuth()
  const action = useAuthAction()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [resent, setResent] = useState(false)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = { email: !isRguktEmail(email) ? STUDENT_MESSAGES.email : undefined, password: !password ? 'Enter your password.' : undefined }
    setErrors(next)
    if (next.email || next.password) return
    void action.run(() => auth.logIn(email, password))
  }
  return <AuthLayout>
    <p className="auth-kicker">Your space, right where you left it</p>
    <h1>Welcome back<br />to Pivot Sols.</h1>
    <p className="auth-subtitle">Log in with your RGUKT account to continue.</p>
    <AuthNotice error={action.error ?? auth.error} />
    <form className="auth-form" noValidate onSubmit={submit} aria-busy={Boolean(action.busy)}>
      <InputGroup id="login-email" type="email" label="RGUKT Email" placeholder="Your ID@rguktn.ac.in" autoComplete="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={(e) => { setEmail(e.target.value); setErrors({}); setResent(false) }} error={errors.email} />
      <InputGroup id="login-password" type="password" label="Password" placeholder="Enter your password" autoComplete="current-password" required value={password} onChange={(e) => { setPassword(e.target.value); setErrors({}) }} error={errors.password} />
      <button type="submit" className="auth-button auth-submit" disabled={Boolean(action.busy)}>{action.busy === 'form' ? 'Logging in...' : 'Log In'}<ArrowUpRight size={17} aria-hidden="true" /></button>
    </form>
    {action.error?.startsWith('Verify your RGUKT email') && <button type="button" className="auth-text-button" disabled={Boolean(action.busy) || resent} onClick={() => void action.run(async () => { await auth.resendVerification(email); setResent(true) })}>Resend verification email</button>}
    {resent && <p role="status" className="field-hint">Check your inbox for a new verification link.</p>}
    <div className="auth-divider"><span>OR</span></div>
    <GoogleButton disabled={Boolean(action.busy) || !auth.configured} loading={action.busy === 'google'} onClick={() => void action.run(auth.googleSignIn, 'google')} />
    <p className="auth-switch">New to Pivot Sols? <Link to="/signup">Create an account</Link></p>
    <AgentLoginLink />
  </AuthLayout>
}
