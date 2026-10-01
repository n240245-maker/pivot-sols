import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import { createDemoSession, getDemoSession, clearDemoSession, DEMO_PROFILE_KEY, DEMO_SESSION_KEY } from '../lib/demoSession'
import { DEMO_MODE } from '../config/demo'
import { verifyOtp } from '../lib/otpApi'

// Shares the normalized profile interface; no Supabase session is fabricated.
export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState(() => DEMO_MODE ? getDemoSession() : null)
  const revision = useRef(0)
  const verifying = useRef(false)
  useEffect(() => {
    if (!DEMO_MODE) return
    const sync = (event: StorageEvent) => {
      if (event.key === null || event.key === DEMO_PROFILE_KEY || event.key === DEMO_SESSION_KEY) { revision.current++; setProfile(getDemoSession()) }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  const unavailable = async (): Promise<never> => { throw new Error('Use the prototype login to continue.') }
  return <AuthContext.Provider value={{
    session: null, user: null, profile, loading: false, error: null, configured: true,
    signUp: unavailable, logIn: unavailable, googleSignIn: unavailable, resendVerification: unavailable,
    completeDemoLogin: async (details, otp) => {
      if (!DEMO_MODE || verifying.current) throw new Error('Verification is unavailable. Please try again.')
      verifying.current = true
      const currentRevision = revision.current
      try {
        const verified = await verifyOtp(details.email, otp)
        if (currentRevision !== revision.current) throw new Error('The session changed. Please sign in again.')
        setProfile(createDemoSession(details, verified))
      } finally { verifying.current = false }
    },
    refreshProfile: async () => { if (DEMO_MODE) setProfile(getDemoSession()) },
    signOut: async () => { if (DEMO_MODE) { revision.current++; try { clearDemoSession() } finally { setProfile(null) } } },
  }}>{children}</AuthContext.Provider>
}
