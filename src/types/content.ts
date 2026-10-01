import type { ReferenceCatalog, Branch } from './referenceBooks'
import type { LabCatalog } from './labVideos'
import type { CareerDomain, CareerRole, RoadmapStage } from './careers'

export interface BranchGuide extends Branch { overview: string; areas: readonly string[]; domainSlugs: readonly string[]; roleIds: readonly string[] }
export interface AboutContent { title: string; eyebrow: string; intro: string; why_title: string; why: readonly RoadmapStage[]; goal_title: string; goal: string }
export interface ExploreContent { title: string; description: string; academic_title: string; careers_title: string; tools_title: string; cards: readonly {path: string; title: string; description: string}[] }
export interface PublicContent {
  books: ReferenceCatalog
  labs: LabCatalog
  domains: readonly CareerDomain[]
  roles: readonly CareerRole[]
  branches: readonly BranchGuide[]
  site: {about?: AboutContent; explore?: ExploreContent}
}
export const emptyContent: PublicContent = {books:{demo:false,curricula:[],subjects:[],books:[]},labs:{demo:false,curricula:[],labs:[]},domains:[],roles:[],branches:[],site:{}}
