import type { Curriculum, ReferenceCatalog, Semester, Subject } from '../types/referenceBooks'
import type { SupportedAcademicLevel } from '../types/student'

export const BOOKS_ROOT = '/resources/books'
export const getCurriculaForLevel = (data: ReferenceCatalog, level: SupportedAcademicLevel) => data.curricula.filter(c => c.level === level)
export const getBranchesForLevel = (data: ReferenceCatalog, level: SupportedAcademicLevel) => getCurriculaForLevel(data, level).flatMap(c => c.branch ? [c.branch] : [])
export const getSemesters = (curriculum: Curriculum) => curriculum.semesters
export const getSubjects = (data: ReferenceCatalog, curriculumId: string, semesterId: string) => data.subjects.filter(s => s.curriculumId === curriculumId && s.semesterId === semesterId)
export const getBooks = (data: ReferenceCatalog, subjectId: string) => data.books.filter(b => b.subjectId === subjectId)
export const findSubjectBySlug = (data: ReferenceCatalog, curriculumId: string, semesterId: string, slug: string) => getSubjects(data, curriculumId, semesterId).find(s => s.slug === slug)
export function booksPath(curriculum: Curriculum, semester?: Semester, subject?: Subject) {
  return [BOOKS_ROOT, curriculum.level.toLowerCase(), curriculum.id, semester?.id, subject?.slug].filter(Boolean).join('/')
}
export interface BooksRoute { valid: boolean; curriculum?: Curriculum; semester?: Semester; subject?: Subject }
export function resolveBooksRoute(data: ReferenceCatalog, level: SupportedAcademicLevel, pathname: string): BooksRoute {
  const path = pathname.replace(/\/$/, '')
  if (path === BOOKS_ROOT) return { valid: true }
  if (!path.startsWith(`${BOOKS_ROOT}/`)) return { valid: false }
  const parts = path.slice(BOOKS_ROOT.length + 1).split('/')
  if (parts.length < 2 || parts.length > 4 || parts.some(p => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p))) return { valid: false }
  if (parts[0] !== level.toLowerCase()) return { valid: false }
  const curriculum = getCurriculaForLevel(data, level).find(c => c.id === parts[1])
  if (!curriculum) return { valid: false }
  const semester = parts[2] ? curriculum.semesters.find(s => s.id === parts[2]) : undefined
  if (parts[2] && !semester) return { valid: false }
  const subject = semester && parts[3] ? findSubjectBySlug(data, curriculum.id, semester.id, parts[3]) : undefined
  if (parts[3] && !subject) return { valid: false }
  return { valid: true, curriculum, semester, subject }
}
export interface ResourceCrumb { label: string; to?: string }
export function getBooksBreadcrumbs(route: BooksRoute, level: SupportedAcademicLevel): ResourceCrumb[] {
  const crumbs: ResourceCrumb[] = [{ label: 'Reference Books', to: BOOKS_ROOT }, { label: level, to: BOOKS_ROOT }]
  const { curriculum, semester, subject } = route
  if (curriculum?.branch) crumbs.push({ label: curriculum.branch.shortName ?? curriculum.branch.name, to: booksPath(curriculum) })
  if (curriculum && semester) crumbs.push({ label: semester.name, to: booksPath(curriculum, semester) })
  if (subject) crumbs.push({ label: subject.name })
  return crumbs.map((crumb, index) => index === crumbs.length - 1 ? { label: crumb.label } : crumb)
}
export function searchResources(data: ReferenceCatalog, level: SupportedAcademicLevel, query: string, scope: BooksRoute = { valid: true }) {
  const term = query.trim().toLocaleLowerCase()
  const curricula = getCurriculaForLevel(data, level)
  return data.subjects.filter(s => curricula.some(c => c.id === s.curriculumId) && (!scope.curriculum || s.curriculumId === scope.curriculum.id) && (!scope.semester || s.semesterId === scope.semester.id) && (!scope.subject || s.id === scope.subject.id)).flatMap(subject => {
    const subjectMatches = `${subject.name} ${subject.code ?? ''}`.toLocaleLowerCase().includes(term)
    const books = getBooks(data, subject.id).filter(book => subjectMatches || `${book.title} ${book.authors.join(' ')}`.toLocaleLowerCase().includes(term))
    return subjectMatches || books.length ? [{ subject, books }] : []
  })
}
// Local supplied assets and HTTPS sources only; never render executable URLs.
export function safeResourceUrl(value?: string): string | undefined {
  if (!value || value !== value.trim() || /[\\\u0000-\u0020]/.test(value)) return undefined
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined } catch { return undefined }
}
