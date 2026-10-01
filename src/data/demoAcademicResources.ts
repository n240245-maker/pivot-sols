import type { ReferenceBook, ReferenceCatalog, Subject } from '../types/referenceBooks'
import { prototypeBranches, prototypeSemesters } from '../config/academicResources'

// Presentation data only. Replace through the separate production data layer
// when a confirmed RGUKT curriculum and approved resources are supplied.
function subjectsFor(curriculumId: string, semesterId: string, names: readonly string[]): Subject[] {
  return names.map(name => {
    const slug = name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    return { id: `${curriculumId}-${semesterId}-${slug}`, curriculumId, semesterId, name, slug }
  })
}
const subjects: readonly Subject[] = [
  ...subjectsFor('common', 'semester-1', ['Mathematics', 'Physics', 'Chemistry', 'English', 'Introduction to Computing']),
  ...subjectsFor('common', 'semester-2', ['Mathematics II', 'Physics II', 'Basic Electrical Engineering', 'Programming Fundamentals', 'Engineering Drawing']),
  ...subjectsFor('cse', 'semester-1', ['C Programming', 'Data Structures', 'Digital Logic', 'Discrete Mathematics', 'Computer Organization']),
  ...subjectsFor('cse', 'semester-2', ['Algorithms', 'Object Oriented Programming', 'Database Management Systems', 'Operating Systems', 'Probability & Statistics']),
  ...subjectsFor('ece', 'semester-1', ['Network Theory', 'Electronic Devices', 'Engineering Mathematics', 'Electromagnetic Theory', 'C Programming']),
  ...subjectsFor('ece', 'semester-2', ['Analog Electronics', 'Digital Electronics', 'Signals and Systems', 'Electrical Machines', 'Probability & Random Processes']),
]
type BookMetadata = Pick<ReferenceBook, 'title' | 'authors'>
const suppliedReferences: Readonly<Record<string, readonly BookMetadata[]>> = {
  'Network Theory': [
    { title: 'Engineering Circuit Analysis', authors: ['William H. Hayt'] },
    { title: 'Network Analysis', authors: ['M. E. Van Valkenburg'] },
  ],
  'C Programming': [{ title: 'The C Programming Language', authors: ['Brian W. Kernighan', 'Dennis M. Ritchie'] }],
  'Electromagnetic Theory': [{ title: 'Introduction to Electrodynamics', authors: ['David J. Griffiths'] }],
}
const books: readonly ReferenceBook[] = subjects.flatMap(subject => {
  // Generic sample metadata for the remaining supplied subjects, never a claimed recommendation.
  const references = suppliedReferences[subject.name] ?? [{ title: `${subject.name} — Sample Reference`, authors: ['Sample Author'] }]
  return references.map((reference, index) => ({
    ...reference, id: `${subject.id}-book-${index + 1}`, subjectId: subject.id, type: 'Reference Book' as const,
    description: suppliedReferences[subject.name] ? 'A reference listing for the Pivot Sols prototype. No downloadable file is included.' : 'Sample metadata for the presentation. The final reading list will be added later.',
  }))
})

export const demoAcademicResources: ReferenceCatalog = {
  demo: true,
  curricula: [
    { id: 'common', level: 'P1', semesters: prototypeSemesters },
    ...prototypeBranches.map(branch => ({ id: branch.id, level: 'E1' as const, branch, semesters: prototypeSemesters })),
  ],
  subjects,
  books,
}
