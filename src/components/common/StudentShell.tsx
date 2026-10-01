import type { ReactNode } from 'react'
import { LogOut } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../contexts/AuthContext'
import { useAuthAction } from '../auth/useAuthAction'
import { AppShell } from '../dashboard/AppShell'
import { LoadingScreen } from './LoadingScreen'
import { ProfileLoadError } from '../dashboard/ProfileLoadError'
import { ContentBoundary } from '../resources/ContentBoundary'

export function LogoutButton() {
  const { signOut } = useAuth()
  const action = useAuthAction()
  const navigate = useNavigate()
  return <><button type="button" className="logout-button" disabled={Boolean(action.busy)} onClick={() => void action.run(async () => { await signOut(); navigate('/', { replace: true }) })}><LogOut size={16} />{action.busy ? 'Logging out...' : 'Log Out'}</button>{action.error && <p className="field-error" role="alert">{action.error}</p>}</>
}

export function StudentShell({ children }: { children?: ReactNode }) {
  const { profile, loading, refreshProfile } = useAuth()
  const {pathname} = useLocation()
  const action = useAuthAction()
  if (loading) return <LoadingScreen />
  if (!profile) return <ProfileLoadError onRetry={() => void action.run(() => refreshProfile())} busy={Boolean(action.busy)} error={action.error} logoutAction={<LogoutButton />} />
  const contentPage = /^\/(resources|careers|explore|branches|about)(\/|$)/.test(pathname)
  return <AppShell profile={profile} logoutAction={<LogoutButton />}>{contentPage ? <ContentBoundary>{children ?? <Outlet />}</ContentBoundary> : children ?? <Outlet />}</AppShell>
}
