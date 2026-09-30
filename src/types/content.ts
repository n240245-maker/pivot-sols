import type { ReferenceCatalog, Branch } from './referenceBooks'
import type { LabCatalog } from './labVideos'
import type { CareerDomain, CareerRole, RoadmapStage } from './careers'

export interface BranchGuide extends Branch { overview: string; areas: readonly string[]; domainSlugs: readonly string[]; roleIds: readonly string[] }
export interface AboutContent { title: string; eyebrow: string; intro: string; why_title: string; why: readonly RoadmapStage[]; goal_title: string; goal: string }
export interface ExploreContent { title: string; description: string; academic_title: string; careers_title: string; tools_title: string; cards: readonly {path: string; title: string; description: string}[] }
export interface InformationRoom {id:string;name:string;room_number:string;phone_number:string;floor:string;description:string;updated_at:string}
export interface FacultySubject {id:string;name:string;slug:string}
export interface FacultyMember {id:string;subject_id:string;name:string;designation:string;mobile_number:string;email:string;room_number:string;image_url:string|null}
export interface CareerResource {id:string;resource_type:'domain'|'job';branch_id:string;title:string;description:string;pdf_url:string|null;supporting_url:string|null;youtube_url:string|null;storage_type:'object'|'external'|null;tags:readonly string[];updated_at:string}
export interface PublicContent {
  books: ReferenceCatalog
  labs: LabCatalog
  domains: readonly CareerDomain[]
  roles: readonly CareerRole[]
  branches: readonly BranchGuide[]
  rooms: readonly InformationRoom[]
  faculty_subjects: readonly FacultySubject[]
  faculty: readonly FacultyMember[]
  career_resources: readonly CareerResource[]
  site: {about?: AboutContent; explore?: ExploreContent}
}
export const emptyContent: PublicContent = {books:{demo:false,curricula:[],subjects:[],books:[]},labs:{demo:false,curricula:[],labs:[]},domains:[],roles:[],branches:[],rooms:[],faculty_subjects:[],faculty:[],career_resources:[],site:{}}
