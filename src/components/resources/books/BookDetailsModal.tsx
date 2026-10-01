import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import type { ReferenceBook } from '../../../types/referenceBooks'
import { safeResourceUrl } from '../../../lib/referenceBooks'
import { BookCoverPlaceholder } from './BookCoverPlaceholder'

export function BookDetailsModal({ book, subjectName, onClose, demo = true }: { demo?: boolean; book: ReferenceBook; subjectName: string; onClose: () => void }) {
  const resource = demo ? undefined : safeResourceUrl(book.resourceUrl)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const availabilityId = useId()
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (trigger?.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [])

  return <dialog ref={dialogRef} className="books-details-modal" aria-labelledby={titleId} aria-describedby={availabilityId}
    onCancel={event => { event.preventDefault(); onClose() }}
    onClick={event => {
      if (event.target !== event.currentTarget) return
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
    }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const buttons = [...event.currentTarget.querySelectorAll<HTMLElement>('button, a[href]')]
      const first = buttons[0], last = buttons.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}>
    <div className="books-modal-top"><span>{demo ? 'Prototype resources' : 'Reference book details'}</span><button ref={closeRef} className="pivot-icon-button" type="button" aria-label="Close book details" onClick={onClose}><X size={20} aria-hidden="true" /></button></div>
    <div className="books-modal-summary"><div className="books-cover"><BookCoverPlaceholder subjectName={subjectName} /></div><div><p className="books-source">{book.type ?? 'Reference Book'}</p><h2 id={titleId}>{book.title}</h2></div></div>
    <dl className="books-modal-fields"><div><dt>Author</dt><dd>{book.authors.join(', ') || 'Not listed'}</dd></div><div><dt>Category</dt><dd>{book.type ?? 'Reference Book'}</dd></div><div><dt>Subject</dt><dd>{subjectName}</dd></div></dl>
    {!demo && <>{(book.edition || book.publisher) && <p>{[book.edition,book.publisher].filter(Boolean).join(' · ')}</p>}{book.description && <p>{book.description}</p>}</>}
    <div className="books-modal-availability"><h3>Availability</h3><p id={availabilityId}>{demo ? 'Resource link will be added in the full version of Pivot Sols.' : resource ? 'A resource link is available.' : 'Resource coming soon.'}</p>{resource && <a className="books-resource-action" href={resource} target="_blank" rel="noopener noreferrer">Open Resource <span className="sr-only">(opens in a new tab)</span></a>}</div>
    <button type="button" className="books-resource-action books-modal-close" onClick={onClose}>Close</button>
  </dialog>
}
