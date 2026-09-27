import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../contexts/AuthContext'

export function E1Route() {
  const { profile } = useAuth()
  return profile?.academicLevel === 'E1' ? <Outlet /> : <Navigate to="/dashboard" replace />
}
