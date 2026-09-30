import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../contexts/AuthContext'

export function P1Route() {
  const { profile } = useAuth()
  return profile?.academicLevel === 'P1' ? <Outlet /> : <Navigate to="/dashboard" replace />
}
