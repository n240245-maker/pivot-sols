import { ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
export function SelectionCard({ to, title, detail, icon: Icon, onSelect }: { to: string; title: string; detail?: string; icon: LucideIcon; onSelect?: () => void }) {
  return <Link className="books-selection-card" to={to} onClick={onSelect}><span className="books-icon"><Icon size={23} strokeWidth={1.5} aria-hidden="true" /></span><h3>{title}</h3>{detail && <p>{detail}</p>}<ArrowUpRight className="books-arrow" size={19} aria-hidden="true" /></Link>
}
