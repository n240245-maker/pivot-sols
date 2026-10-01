import type { ReferenceBook } from '../../../types/referenceBooks'
import { BookCard } from './BookCard'
import { ResourceEmptyState } from './ResourceEmptyState'
export function BookList({ books, demo, subjectName }: { books: readonly ReferenceBook[]; demo: boolean; subjectName?: string }) {
  return books.length ? <div className="books-list books-list-prototype">{books.map(book => <BookCard key={book.id} book={book} demo={demo} subjectName={subjectName} />)}</div> : <ResourceEmptyState title="No reference books have been added for this subject yet." description="We're preparing resources for this subject." />
}
