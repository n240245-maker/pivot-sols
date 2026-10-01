import { Link } from 'react-router'
import { Logo } from '../components/Logo'

export function NotFoundPage() {
  return <main className="branded-state"><Logo /><p className="auth-kicker">404 · Page not found</p><h1>A different pivot.</h1><p>We couldn't find that page.</p><Link to="/" className="button button-primary">Back to home</Link></main>
}
