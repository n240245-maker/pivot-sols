import type { ReferenceCatalog } from '../../types/referenceBooks'

// DEVELOPMENT FIXTURE ONLY. No campus recommendations, official syllabus or real books.
export const demoReferenceBooks: ReferenceCatalog = {
  demo: true,
  curricula: [
    { id: 'common', level: 'P1', semesters: [{ id: 'sample-1', name: 'Sample Semester 1' }, { id: 'sample-2', name: 'Sample Semester 2' }] },
    { id: 'sample-engineering', level: 'E1', branch: { id: 'sample-engineering', name: 'Sample Engineering Branch', shortName: 'DEMO' }, semesters: [{ id: 'sample-1', name: 'Sample Semester 1' }] },
  ],
  subjects: [
    { id: 'demo-p1-subject', curriculumId: 'common', semesterId: 'sample-1', name: 'Sample Subject', slug: 'sample-subject' },
    { id: 'demo-e1-subject', curriculumId: 'sample-engineering', semesterId: 'sample-1', name: 'Sample Subject', slug: 'sample-subject' },
    { id: 'demo-e1-empty', curriculumId: 'sample-engineering', semesterId: 'sample-1', name: 'Sample Empty Subject', slug: 'sample-empty-subject' },
  ],
  books: [
    { id: 'demo-p1-book', subjectId: 'demo-p1-subject', title: 'Sample Reference Book', authors: ['Sample Author'], edition: 'Sample edition', description: 'A development example to preview the reference card. This is not a recommended textbook.' },
    { id: 'demo-e1-book', subjectId: 'demo-e1-subject', title: 'Sample Reference Book', authors: ['Sample Author'], publisher: 'Sample Publisher', description: 'Development example only. Real resource links will be added after review.' },
  ],
}
