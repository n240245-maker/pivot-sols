import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { getStudentName } from '../lib/studentProfile'
import { normalizeStudentId, validateStudentId } from '../lib/studentValidation'
import { AuthLayout } from '../components/auth/AuthLayout'
import { AuthNotice } from '../components/auth/AuthNotice'
import { InputGroup } from '../components/auth/InputGroup'
import { DetectedYear } from '../components/auth/DetectedYear'
import { useAuthAction } from '../components/auth/useAuthAction'
import { LoadingScreen } from '../components/common/LoadingScreen'

export function CompleteProfilePage() {
  const auth = useAuth()
  const action = useAuthAction()
  const navigate = useNavigate()
  const [studentId, setStudentId] = useState('')
  const [idError, setIdError] = useState<string>()
  if (auth.loading) return <LoadingScreen />
  if (!auth.user || !auth.session) return <Navigate to="/login" replace />
  if (auth.profile) return <Navigate to="/dashboard" replace />
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const error = validateStudentId(studentId, auth.user?.email)
    setIdError(error)
    if (!error) void action.run(() => auth.refreshProfile(normalizeStudentId(studentId)))
  }
  return <AuthLayout activeStep={2}>
    <p className="auth-kicker">One last step</p><h1>Complete Your Profile</h1>
    <p className="auth-subtitle">Add your RGUKT ID so we can find the right resources for your year.</p>
    <div className="verified-account"><span className="account-initial">{getStudentName(auth.user).charAt(0)}</span><div><strong>{getStudentName(auth.user)}</strong><span>{auth.user.email}</span></div></div>
    <AuthNotice error={action.error ?? auth.error} />
    <form className="auth-form" noValidate onSubmit={submit}>
      <InputGroup id="complete-id" label="RGUKT ID" placeholder="N240001" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={16} required value={studentId} onChange={(e) => { setStudentId(e.target.value); setIdError(undefined) }} error={idError} />
      <DetectedYear studentId={studentId} />
      <button type="submit" className="auth-button auth-submit" disabled={Boolean(action.busy)}>{action.busy ? 'Creating your profile...' : 'Continue to dashboard'}</button>
    </form>
    <button type="button" className="auth-text-button" disabled={Boolean(action.busy)} onClick={() => void action.run(async () => { await auth.signOut(); navigate('/', { replace: true }) })}>Log out</button>
  </AuthLayout>
}
