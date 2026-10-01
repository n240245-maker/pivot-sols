import { DEMO_MODE } from './demo'
import { demoLabResources } from '../data/demoLabResources'
import { productionLabResources } from '../data/labVideos/productionLabResources'

export const labVideosCatalog = DEMO_MODE ? demoLabResources : productionLabResources
