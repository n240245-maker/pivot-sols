import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { Logo } from '../Logo'
import { AuthVideoPanel } from './AuthVideoPanel'

export function AuthLayout({ children, activeStep = 1 }: { children: ReactNode; activeStep?: number }) {
  return (
    <div className="auth-layout">
      <a className="skip-link" href="#auth-content">Skip to form</a>
      <AuthVideoPanel activeStep={activeStep} />
      <section className="auth-form-panel">
        <header className="auth-mobile-header"><Logo /></header>
        <Link to="/" className="auth-back"><ArrowLeft size={14} aria-hidden="true" />Back to home</Link>
        <main id="auth-content" className="auth-form-content" tabIndex={-1}>{children}</main>
        <p className="auth-campus-note">P1 &amp; E1 students <span>·</span> RGUKT Nuzvid</p>
      </section>
    </div>
  )
}
