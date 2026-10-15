import { Library } from 'lucide-react'
import type { Curriculum, ReferenceCatalog, Semester } from '../../../types/referenceBooks'
import { booksPath, getBooks, getSubjects } from '../../../lib/referenceBooks'
import { SelectionCard } from './SelectionCard'
import { ResourceEmptyState } from './ResourceEmptyState'
import { hasSingleYearTerm } from '../../../config/academicTerm'
export function SubjectGrid({ curriculum, semester, data }: { curriculum: Curriculum; semester?: Semester; data: ReferenceCatalog }) {
  const subjects = hasSingleYearTerm(curriculum.level)
    ? data.subjects.filter(subject => subject.curriculumId === curriculum.id)
    : semester ? getSubjects(data, curriculum.id, semester.id) : []
  const branchPending = data.demo && curriculum.branch && !data.subjects.some(subject => subject.curriculumId === curriculum.id)
  return <section className="books-section"><h2>Choose a Subject</h2><p className="books-section-copy">Open a subject to see its reference books.</p>{subjects.length ? <div className="books-grid">{subjects.map(s => { const count = getBooks(data, s.id).length; return <SelectionCard key={s.id} to={booksPath(curriculum, semester, s)} title={s.name} detail={[s.code, `${count} ${count === 1 ? 'book' : 'books'}${data.demo ? ' · Demo content' : ''}`].filter(Boolean).join(' · ')} icon={Library} /> })}</div> : <ResourceEmptyState title={branchPending ? 'Resources for this branch are being prepared.' : hasSingleYearTerm(curriculum.level) ? "Subjects for P1 haven't been added yet." : "Subjects for this semester haven't been added yet."} description={branchPending ? 'More subjects will be added soon.' : undefined} />}</section>
}
