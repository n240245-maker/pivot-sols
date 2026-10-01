import { BookOpen } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
export function ResourceEmptyState({ title, description, icon: Icon = BookOpen }: { title: string; description?: string; icon?: LucideIcon }) {
  return <div className="books-empty" role="status"><span className="books-icon"><Icon size={25} strokeWidth={1.5} aria-hidden="true" /></span><h3>{title}</h3>{description && <p>{description}</p>}</div>
}
