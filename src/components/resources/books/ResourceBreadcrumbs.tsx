import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import type { ResourceCrumb } from '../../../lib/referenceBooks'
export function ResourceBreadcrumbs({ items }: { items: readonly ResourceCrumb[] }) {
  return <nav aria-label="Breadcrumb" className="books-breadcrumb"><ol>{items.map((item, i) => <li key={`${item.label}-${i}`}>{i > 0 && <ChevronRight size={12} aria-hidden="true" />}{item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</span>}</li>)}</ol></nav>
}
