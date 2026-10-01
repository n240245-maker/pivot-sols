import { useNavigate } from 'react-router'
import { useAuth } from '../../contexts/AuthContext'
import { AuthLayout } from './AuthLayout'
import { AuthNotice } from './AuthNotice'
import { useAuthAction } from './useAuthAction'

export function AccessProblem() {
  const { error, refreshProfile, signOut } = useAuth()
  const action = useAuthAction()
  const navigate = useNavigate()
  return <AuthLayout activeStep={2}><h1>Let's check your account</h1><p className="auth-subtitle">Your student profile needs attention before you can continue.</p><AuthNotice error={action.error ?? error} /><button type="button" className="auth-button auth-submit" disabled={Boolean(action.busy)} onClick={() => void action.run(() => refreshProfile())}>Try again</button><button type="button" className="auth-text-button" disabled={Boolean(action.busy)} onClick={() => void action.run(async () => { await signOut(); navigate('/login', { replace: true }) })}>Log out and use another account</button></AuthLayout>
}
