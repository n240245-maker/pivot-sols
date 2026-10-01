import type { SupportedAcademicLevel } from './student'

export interface Branch { id: string; name: string; shortName?: string }
export interface Semester { id: string; name: string; number?: number }
export interface Curriculum {
  id: string
  level: SupportedAcademicLevel
  branch?: Branch
  semesters: readonly Semester[]
}
export interface Subject {
  id: string
  curriculumId: string
  semesterId: string
  name: string
  slug: string
  code?: string
}
export interface ReferenceBook {
  id: string
  subjectId: string
  title: string
  authors: readonly string[]
  type?: string
  edition?: string
  publisher?: string
  coverUrl?: string
  resourceUrl?: string
  sourceType?: 'official' | 'library' | 'external' | 'uploaded'
  description?: string
}
export interface ReferenceCatalog {
  demo: boolean
  curricula: readonly Curriculum[]
  subjects: readonly Subject[]
  books: readonly ReferenceBook[]
}
