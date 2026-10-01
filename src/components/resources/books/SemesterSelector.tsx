import { CalendarDays } from 'lucide-react'
import type { Curriculum, ReferenceCatalog } from '../../../types/referenceBooks'
import { booksPath, getSemesters, getSubjects } from '../../../lib/referenceBooks'
import { SelectionCard } from './SelectionCard'
import { ResourceEmptyState } from './ResourceEmptyState'
export function SemesterSelector({ curriculum, data }: { curriculum: Curriculum; data: ReferenceCatalog }) {
  const semesters = getSemesters(curriculum)
  return <section className="books-section"><h2>Choose Semester</h2><p className="books-section-copy">Find the subjects in your curriculum.</p>{semesters.length ? <div className="books-grid books-semester-grid">{semesters.map(s => { const count = getSubjects(data, curriculum.id, s.id).length; return <SelectionCard key={s.id} to={booksPath(curriculum, s)} title={s.name} detail={count ? `${count} ${count === 1 ? 'subject' : 'subjects'}` : "Resources for this semester haven't been added yet."} icon={CalendarDays} /> })}</div> : <ResourceEmptyState title="Semesters haven't been added yet." description="Your curriculum's semester information will appear here when it is available." />}</section>
}
