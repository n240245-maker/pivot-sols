import { Navigate, Link, useLocation } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { AuthLayout } from '../components/auth/AuthLayout'
import { AuthNotice } from '../components/auth/AuthNotice'
import { LoadingScreen } from '../components/common/LoadingScreen'
import { AccessProblem } from '../components/auth/AccessProblem'

export function AuthCallbackPage() {
  const { loading, user, profile, error } = useAuth()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const hash = new URLSearchParams(location.hash.slice(1))
  const callbackFailed = params.has('error') || params.has('error_code') || hash.has('error') || hash.has('error_code')
  // The singleton Supabase client exchanges the PKCE code once on initialize.
  // This page only observes the central state; it never exchanges it on render.
  if (loading && !callbackFailed) return <LoadingScreen message="Signing you in..." />
  if (user && error) return <AccessProblem />
  if (user && !callbackFailed) return <Navigate to={profile ? '/dashboard' : '/complete-profile'} replace />
  return <AuthLayout><h1>Let's get you signed in.</h1><p className="auth-subtitle">Your sign-in was cancelled or the link could not be used. Try again with your RGUKT Nuzvid account.</p><AuthNotice error={error} /><Link to="/login" replace className="auth-button auth-submit">Back to login</Link></AuthLayout>
}
