import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import type { ReferenceBook } from '../../../types/referenceBooks'
import { safeResourceUrl } from '../../../lib/referenceBooks'
import { BookCoverPlaceholder } from './BookCoverPlaceholder'
import { BookDetailsModal } from './BookDetailsModal'
export function BookCard({ book, demo = false, subjectName = 'Selected subject' }: { book: ReferenceBook; demo?: boolean; subjectName?: string }) {
  const [failedCover, setFailedCover] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const cover = demo ? undefined : safeResourceUrl(book.coverUrl)
  const resource = safeResourceUrl(book.resourceUrl)
  const sources = { official: 'Official source', library: 'Library source', external: 'External source', uploaded: 'Provided resource' }
  return <article className="books-book-card"><div className="books-cover">{cover && !failedCover ? <img src={cover} alt={`Cover of ${book.title}`} loading="lazy" onError={() => setFailedCover(true)} /> : <BookCoverPlaceholder subjectName={subjectName} />}</div><div className="books-book-detail"><p className="books-source">{book.type ?? (book.sourceType ? sources[book.sourceType] : 'Reference Book')}</p><h3>{book.title}</h3>{book.authors.length > 0 && <p className="books-authors">{book.authors.join(', ')}</p>}{(book.edition || book.publisher) && <p className="books-publication">{[book.edition, book.publisher].filter(Boolean).join(' · ')}</p>}{book.description && <p className="books-description">{book.description}</p>}{<div className="books-demo-actions"><button type="button" className="books-resource-action" aria-haspopup="dialog" onClick={() => setDetailsOpen(true)}>View Details<ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only"> for {book.title}</span></button>{!demo && resource ? <a className="books-resource-action" href={resource} target="_blank" rel="noopener noreferrer">Open Resource<ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a> : <span className="books-availability-label">Resource coming soon</span>}</div>}</div>{detailsOpen && <BookDetailsModal demo={demo} book={book} subjectName={subjectName} onClose={() => setDetailsOpen(false)} />}</article>
}
