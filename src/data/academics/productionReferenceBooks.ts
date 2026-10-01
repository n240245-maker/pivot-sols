import type { ReferenceCatalog } from '../../types/referenceBooks'
import { curricula } from './curricula'
import { p1Subjects } from './p1/subjects'
import { p1Books } from './p1/books'
import { e1Subjects } from './e1/subjects'
import { e1Books } from './e1/books'

export const productionReferenceBooks: ReferenceCatalog = {
  demo: false, curricula, subjects: [...p1Subjects, ...e1Subjects], books: [...p1Books, ...e1Books],
}
