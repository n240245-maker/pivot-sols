import type { Curriculum } from '../../types/referenceBooks'

// Structural configuration only. Add confirmed branch/semester names here.
// P1 starts with a common curriculum; E1 branches await supplied campus data.
export const curricula: readonly Curriculum[] = [
  { id: 'common', level: 'P1', semesters: [] },
]
