import { BookOpen } from 'lucide-react'
export function BookCoverPlaceholder({ subjectName }: { subjectName?: string }) {
  return <div className="books-cover-placeholder" aria-hidden="true"><span>PIVOT<br />REFERENCE</span><BookOpen size={30} strokeWidth={1} /><span>{subjectName ?? 'Reference'}</span></div>
}
