export const adminResources=['branches','semesters','subjects','books','labs','experiments','career-domains','career-roles','site-content'] as const
export type AdminResource=typeof adminResources[number]
export type ContentStatus='draft'|'published'|'archived'
export interface AdminRecord {id:string;status:ContentStatus;sort_order:number;created_at:string;updated_at:string;[field:string]:unknown}
export type AdminCatalog=Record<AdminResource,AdminRecord[]>
export interface AdminIdentity {email:string;display_name:string}
export interface AdminSessionResponse {admin:AdminIdentity;csrf_token:string}
export interface AdminChallenge {challenge:string;expires_in:number;resend_after:number}
export interface ContentDependency {resource:string;total:number;published:number}
export const emptyAdminCatalog:AdminCatalog={'branches':[],'semesters':[],'subjects':[],'books':[],'labs':[],'experiments':[],'career-domains':[],'career-roles':[],'site-content':[]}
export const textValue=(value:unknown):string=>typeof value==='string'?value:''
export const stringsValue=(value:unknown):string[]=>Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[]
