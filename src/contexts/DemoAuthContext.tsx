import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { StudentProfile } from '../types/student'
import { AuthContext } from './AuthContext'
import { DEMO_MODE } from '../config/demo'
import { clearStudentServerSession, getStudentSession, loginStudent } from '../lib/studentSessionApi'

// The backend session is the sole student authentication source.
export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<StudentProfile|null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|null>(null)
  const revision = useRef(0)
  const verifying = useRef(false)

  useEffect(() => {
    if (!DEMO_MODE) return
    let active = true
    const ticket = revision.current
    void getStudentSession().then(restored => {
      if (active && ticket === revision.current) { setProfile(restored); setError(null) }
    }).catch(reason => {
      if (active && ticket === revision.current) setError(reason instanceof Error?reason.message:'Unable to restore your session.')
    }).finally(() => { if (active && ticket === revision.current) setLoading(false) })
    return () => { active = false }
  }, [])

  const unavailable = async (): Promise<never> => { throw new Error('Use the prototype login to continue.') }
  return <AuthContext.Provider value={{
    session: null, user: null, profile, loading, error, configured: true,
    signUp: unavailable, logIn: unavailable, googleSignIn: unavailable, resendVerification: unavailable,
    completeDemoLogin: async (details) => {
      if (!DEMO_MODE || verifying.current) throw new Error('Sign-in is unavailable. Please try again.')
      verifying.current = true
      const ticket = ++revision.current
      try {
        await loginStudent(details)
        const restored = await getStudentSession()
        if (!restored) throw new Error('Your student session could not be restored. Please sign in again.')
        if (ticket !== revision.current) throw new Error('The session changed. Please sign in again.')
        setProfile(restored)
        setError(null)
      } finally { verifying.current = false; if (ticket === revision.current) setLoading(false) }
    },
    refreshProfile: async () => {
      const ticket = ++revision.current
      setLoading(true)
      try {
        const restored = await getStudentSession()
        if (ticket === revision.current) { setProfile(restored); setError(null) }
      } catch (reason) {
        if (ticket === revision.current) setError(reason instanceof Error?reason.message:'Unable to restore your session.')
        throw reason
      } finally { if (ticket === revision.current) setLoading(false) }
    },
    signOut: async () => {
      ++revision.current
      await clearStudentServerSession()
      setProfile(null)
      setError(null)
      setLoading(false)
    },
  }}>{children}</AuthContext.Provider>
}
