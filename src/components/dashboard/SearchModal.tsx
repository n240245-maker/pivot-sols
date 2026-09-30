import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { SupportedAcademicLevel } from '../../types/student'
import { buildLocalSearchIndex, searchLocalResources } from '../../lib/localSearch'
import { LocalSearchResults } from '../resources/LocalSearchResults'
import { useContent } from '../../contexts/ContentContext'
import { ContentBoundary } from '../resources/ContentBoundary'

export function SearchModal({ open, onClose, level }: { open: boolean; onClose: () => void; level: SupportedAcademicLevel }) {
  const {data}=useContent()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const index = useMemo(() => buildLocalSearchIndex(level,data.books,data.labs,data.domains,data.roles,data.branches,data.career_resources,data.rooms,data.faculty,data.faculty_subjects), [level,data])
  const results = searchLocalResources(index, query)
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!open) {
      if (dialog.open) dialog.close()
      return
    }
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open])

  return <dialog ref={dialogRef} className="pivot-search-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} onKeyDown={(event) => {
    if (event.key !== 'Tab') return
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href]')]
    const first = controls[0]
    const last = controls.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }} onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => {
    if (event.target !== event.currentTarget) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose()
  }}>
    <div className="pivot-modal-heading"><h2 id={titleId}>Search Pivot Sols</h2><button type="button" className="pivot-icon-button" aria-label="Close search" onClick={onClose}><X size={20} /></button></div>
    <label className="pivot-search-input"><Search size={19} aria-hidden="true" /><input ref={inputRef} aria-label="Search Pivot Sols resources" placeholder={level==='P1'?'Search books, labs, rooms, faculty...':'Search books and career resources...'} value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" /></label>
    <p id={descriptionId} className="discovery-search-hint">{level==='P1'?'Search academic and campus resources.':'Search academic, branch and career resources.'}</p>
    <ContentBoundary><LocalSearchResults query={query} results={results} onNavigate={onClose} /></ContentBoundary>
    <p className="pivot-modal-hint"><kbd>Esc</kbd> to close</p>
  </dialog>
}
