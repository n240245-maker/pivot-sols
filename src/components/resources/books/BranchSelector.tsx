import { Network } from 'lucide-react'
import { Link } from 'react-router'
import type { Curriculum } from '../../../types/referenceBooks'
import { booksPath } from '../../../lib/referenceBooks'
import { SelectionCard } from './SelectionCard'
import { ResourceEmptyState } from './ResourceEmptyState'
export function BranchSelector({ curricula, selected, onSelect }: { curricula: readonly Curriculum[]; selected?: string; onSelect: (id: string) => void }) {
  const preferred = curricula.find(c => c.id === selected)
  return <section className="books-section"><h2>Choose Your Branch</h2><p className="books-section-copy">Choose a curriculum to browse its resources. You can change this anytime.</p>{preferred && <p className="books-preference">Last selected: <strong>{preferred.branch?.shortName ?? preferred.branch?.name}</strong><Link to={booksPath(preferred)}>Continue <span aria-hidden="true">→</span></Link></p>}{curricula.length ? <div className="books-grid books-branch-grid">{curricula.map(c => <SelectionCard key={c.id} to={booksPath(c)} title={c.branch?.shortName ?? c.branch?.name ?? 'Common curriculum'} detail={c.branch?.shortName ? c.branch.name : undefined} icon={Network} onSelect={() => onSelect(c.id)} />)}</div> : <ResourceEmptyState title="Branch resources haven't been added yet." description="Branch choices will appear once the curriculum information is available." />}</section>
}
