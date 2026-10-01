import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { RegistrationValues, StudentProfile } from '../types/student'
import { authCallbackUrl, isSupabaseConfigured, requireSupabase, supabase } from '../lib/supabase'
import { assertVerifiedStudent, resolveStudentProfile } from '../lib/studentProfile'
import { debugAuthError, friendlyAuthError, StudentAccessError } from '../lib/authErrors'
import { isRguktEmail, normalizeEmail, normalizeStudentId, STUDENT_MESSAGES, validateRegistration } from '../lib/studentValidation'
import type { DemoLoginDetails } from '../lib/demoSession'

interface AuthState {
  session: Session | null
  user: User | null
  profile: StudentProfile | null
  loading: boolean
  error: string | null
}
interface AuthValue extends AuthState {
  completeDemoLogin?: (details: DemoLoginDetails, otp: string) => Promise<void>
  configured: boolean
  signUp: (values: RegistrationValues) => Promise<{ verificationRequired: boolean }>
  logIn: (email: string, password: string) => Promise<void>
  googleSignIn: () => Promise<void>
  resendVerification: (email: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: (studentId?: string) => Promise<void>
}
const emptyState: AuthState = { session: null, user: null, profile: null, loading: false, error: null }
export const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...emptyState, loading: isSupabaseConfigured })
  const generation = useRef(0)
  const mounted = useRef(false)

  const reconcile = useCallback(async (session: Session | null, ticket: number, studentId?: string) => {
    const current = () => mounted.current && ticket === generation.current
    if (!session || !supabase) {
      if (current()) setState((old) => ({ ...emptyState, error: old.error }))
      return
    }
    let verifiedUser: User | null = null
    try {
      // getUser revalidates the stored session against Supabase Auth.
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      if (!current()) return
      if (!data.user || data.user.id !== session.user.id) throw new StudentAccessError('Please log in again to continue.')
      assertVerifiedStudent(data.user)
      verifiedUser = data.user
      const profile = await resolveStudentProfile(data.user, studentId)
      if (current()) setState({ session, user: data.user, profile, loading: false, error: null })
    } catch (error) {
      if (!current()) return
      debugAuthError('Student access', error)
      setState({ session: verifiedUser ? session : null, user: verifiedUser, profile: null, loading: false, error: friendlyAuthError(error) })
      // Invalid/unconfirmed identities never remain authenticated in the app.
      if (!verifiedUser) await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    if (!supabase) return () => { mounted.current = false }
    let active = true
    let sawEvent = false
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const schedule = (session: Session | null) => {
      const ticket = ++generation.current
      setState((old) => ({ ...old, loading: Boolean(session), profile: null }))
      // Keep Supabase API calls outside onAuthStateChange's auth lock.
      const timer = setTimeout(() => {
        timers.delete(timer)
        void reconcile(session, ticket)
      }, 0)
      timers.add(timer)
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      sawEvent = true
      if (!session) {
        ++generation.current
        setState((old) => ({ ...emptyState, error: old.error }))
      } else schedule(session)
    })
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        ++generation.current
        debugAuthError('Session initialization', error)
        setState({ ...emptyState, error: 'This sign-in link could not be used. Please log in or request a new verification email.' })
      } else if (!sawEvent) schedule(data.session)
    }).catch((error: unknown) => {
      if (active) { ++generation.current; setState({ ...emptyState, error: friendlyAuthError(error) }) }
    })
    return () => {
      active = false
      mounted.current = false
      ++generation.current
      timers.forEach(clearTimeout)
      subscription.unsubscribe()
    }
  }, [reconcile])

  const signUp = async (values: RegistrationValues) => {
    const errors = validateRegistration(values)
    if (Object.keys(errors).length) throw new StudentAccessError(Object.values(errors)[0])
    setState((old) => ({ ...old, error: null }))
    const { data, error } = await requireSupabase().auth.signUp({
      email: normalizeEmail(values.email), password: values.password,
      options: { emailRedirectTo: authCallbackUrl(), data: { full_name: values.name.trim(), student_id: normalizeStudentId(values.studentId) } },
    })
    if (error) throw error
    if (data.user?.identities?.length === 0) throw new StudentAccessError('An account already exists for this email. Try logging in instead.')
    return { verificationRequired: !data.session || !data.user?.email_confirmed_at }
  }
  const logIn = async (email: string, password: string) => {
    if (!isRguktEmail(email)) throw new StudentAccessError(STUDENT_MESSAGES.email)
    setState((old) => ({ ...old, error: null }))
    const { error } = await requireSupabase().auth.signInWithPassword({ email: normalizeEmail(email), password })
    if (error) throw error
  }
  const googleSignIn = async () => {
    setState((old) => ({ ...old, error: null }))
    const { error } = await requireSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authCallbackUrl(), queryParams: { hd: 'rguktn.ac.in', prompt: 'select_account' } },
    })
    if (error) throw error
  }
  const resendVerification = async (email: string) => {
    if (!isRguktEmail(email)) throw new StudentAccessError(STUDENT_MESSAGES.email)
    const { error } = await requireSupabase().auth.resend({ type: 'signup', email: normalizeEmail(email), options: { emailRedirectTo: authCallbackUrl() } })
    if (error) throw error
  }
  const signOut = async () => {
    const { error } = await requireSupabase().auth.signOut({ scope: 'local' })
    if (error) throw error
    ++generation.current
    setState(emptyState)
  }
  const refreshProfile = async (studentId?: string) => {
    const ticket = ++generation.current
    setState((old) => ({ ...old, loading: true, error: null }))
    await reconcile(state.session, ticket, studentId)
  }
  return <AuthContext.Provider value={{ ...state, configured: isSupabaseConfigured, signUp, logIn, googleSignIn, resendVerification, signOut, refreshProfile }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
