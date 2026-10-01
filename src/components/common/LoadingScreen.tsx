import { Logo } from '../Logo'

export function LoadingScreen({ message = 'Preparing your space...' }: { message?: string }) {
  return <main className="branded-state" aria-busy="true"><Logo /><div className="loading-line" aria-hidden="true" /><p role="status">{message}</p></main>
}
