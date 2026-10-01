import { Search, X } from 'lucide-react'
import { useId } from 'react'
export function BooksSearch({ query, onChange }: { query: string; onChange: (query: string) => void }) {
  const id = useId()
  return <div className="books-search"><label htmlFor={id}>Search subjects or books</label><div><Search size={19} aria-hidden="true" /><input id={id} type="search" placeholder="Search subjects or books" value={query} onChange={e => onChange(e.target.value)} />{query && <button type="button" aria-label="Clear resource search" onClick={() => onChange('')}><X size={17} /></button>}</div><p>Search the configured subjects, book titles and authors in this view.</p></div>
}
