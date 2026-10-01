import { DEMO_MODE } from './demo'
import { demoAcademicResources } from '../data/demoAcademicResources'
import { productionReferenceBooks } from '../data/academics/productionReferenceBooks'

// Presentation builds need the same local content as npm run dev. Real mode
// continues to select only the separate, confirmed production resource catalog.
export const ENABLE_DEMO_REFERENCE_DATA = DEMO_MODE
export const referenceBooksCatalog = ENABLE_DEMO_REFERENCE_DATA ? demoAcademicResources : productionReferenceBooks
