import { Link } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import type { ResourceDestination } from '../../config/studentNavigation'

export function ResourceCard({ resource }: { resource: ResourceDestination }) {
  const Icon = resource.icon
  return <Link to={resource.path} className={`pivot-resource-card pivot-card-${resource.accent}`} aria-label={resource.title}>
    <div className="pivot-card-top"><span className="pivot-resource-icon liquid-glass"><Icon size={23} strokeWidth={1.55} aria-hidden="true" /></span><span className="pivot-resource-category">{resource.category}</span></div>
    <div className="pivot-card-copy"><h3>{resource.title}</h3><p>{resource.description}</p></div>
    <span className="pivot-card-arrow" aria-hidden="true"><ArrowUpRight size={21} strokeWidth={1.55} /></span>
  </Link>
}
