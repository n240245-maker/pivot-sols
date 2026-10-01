import { RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

export function ProfileLoadError({ onRetry, busy, error, logoutAction }: { onRetry: () => void; busy: boolean; error: string | null; logoutAction: ReactNode }) {
  return <main className="branded-state"><h1>We couldn't load your Pivot Sols profile.</h1><p>Your details aren't available right now. Please try again.</p>{error && <p className="field-error" role="alert">{error}</p>}<button type="button" className="button button-primary" disabled={busy} onClick={onRetry}><RefreshCw size={16} />{busy ? 'Trying again...' : 'Try Again'}</button>{logoutAction}</main>
}
