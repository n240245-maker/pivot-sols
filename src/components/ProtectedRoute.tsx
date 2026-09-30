import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { isRguktEmail, getAcademicLevel, isSupportedAcademicLevel } from '../lib/studentValidation'
import { LoadingScreen } from './common/LoadingScreen'
import { AccessProblem } from './auth/AccessProblem'
import { DEMO_MODE } from '../config/demo'

export function ProtectedRoute() {
  const { session, user, profile, loading, error } = useAuth()
  if (loading) return <LoadingScreen />
  if (DEMO_MODE) return error ? <AccessProblem /> : profile ? <Outlet /> : <Navigate to="/login" replace />
  if (!session || !user || !user.email_confirmed_at || !isRguktEmail(user.email ?? '')) return <Navigate to="/login" replace />
  if (error) return <AccessProblem />
  if (!profile) return <Navigate to="/complete-profile" replace />
  if (!isSupportedAcademicLevel(getAcademicLevel(profile.batch))) return <AccessProblem />
  return <Outlet />
}

export function GuestRoute() {
  const { user, profile, loading, error } = useAuth()
  if (loading) return <LoadingScreen />
  if (DEMO_MODE) return profile ? <Navigate to="/dashboard" replace /> : <Outlet />
  if (user && error) return <AccessProblem />
  if (user) return <Navigate to={profile ? '/dashboard' : '/complete-profile'} replace />
  return <Outlet />
}
