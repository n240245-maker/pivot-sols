import { Link } from 'react-router'
import type { ReferenceCatalog } from '../../../types/referenceBooks'
import type { SupportedAcademicLevel } from '../../../types/student'
import { booksPath, searchResources } from '../../../lib/referenceBooks'
import type { BooksRoute } from '../../../lib/referenceBooks'
import { BookList } from './BookList'
import { ResourceEmptyState } from './ResourceEmptyState'
export function BooksSearchResults({ data, level, query, scope }: { data: ReferenceCatalog; level: SupportedAcademicLevel; query: string; scope: BooksRoute }) {
  const results = searchResources(data, level, query, scope)
  return <section className="books-section"><h2>Search results</h2><p className="books-section-copy" role="status">{results.length} matching {results.length === 1 ? 'subject' : 'subjects'}</p>{results.length ? results.map(({ subject, books }) => {
    const curriculum = data.curricula.find(c => c.id === subject.curriculumId && c.level === level)!
    const semester = curriculum.semesters.find(s => s.id === subject.semesterId)!
    return <div className="books-search-group" key={subject.id}><Link className="books-result-heading" to={booksPath(curriculum, semester, subject)}>{subject.name}<span>{[curriculum.branch?.shortName, semester.name].filter(Boolean).join(' · ')} →</span></Link>{books.length > 0 && <BookList books={books} demo={data.demo} subjectName={subject.name} />}</div>
  }) : <ResourceEmptyState title="No matching resources found." description="Try another subject, title or author." />}</section>
}
