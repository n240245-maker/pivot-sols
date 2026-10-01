import { useEffect, useRef, useState } from 'react'
import { debugAuthError, friendlyAuthError } from '../../lib/authErrors'

export function useAuthAction() {
  const [busy, setBusy] = useState<'form' | 'google' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lock = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    const reset = () => { lock.current = false; setBusy(null) }
    window.addEventListener('pageshow', reset)
    return () => { mounted.current = false; window.removeEventListener('pageshow', reset) }
  }, [])
  const run = async (action: () => Promise<unknown>, kind: 'form' | 'google' = 'form') => {
    if (lock.current) return
    lock.current = true
    setBusy(kind)
    setError(null)
    let succeeded = false
    try { await action(); succeeded = true }
    catch (failure) {
      debugAuthError('Authentication request', failure)
      if (mounted.current) setError(friendlyAuthError(failure))
    } finally {
      if (kind !== 'google' || !succeeded) {
        lock.current = false
        if (mounted.current) setBusy(null)
      }
    }
  }
  return { busy, error, run, setError }
}
