import {API_BASE_URL} from '../config/api'
import type {AdminCatalog,AdminRecord,AdminResource,AdminSessionResponse,ContentDependency,ContentStatus} from '../types/admin'
import type {StudentProblem} from './problemApi'

let csrfToken=''
export class AdminApiError extends Error {
  constructor(message:string,public readonly status:number,public readonly fields:string[]=[],public readonly dependencies:ContentDependency[]=[]){super(message);this.name='AdminApiError'}
}
async function request<T>(path:string,method='GET',body?:unknown):Promise<T> {
  const controller=new AbortController()
  const timeout=setTimeout(()=>controller.abort(),30_000)
  try {
    const response=await fetch(`${API_BASE_URL}/api/admin${path}`,{method,credentials:'include',cache:'no-store',signal:controller.signal,
      headers:{'Content-Type':'application/json','X-Pivot-Admin':'1',...(csrfToken?{'X-CSRF-Token':csrfToken}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})})
    const value:unknown=await response.json()
    if(!response.ok){
      const detail=value&&typeof value==='object'&&'detail' in value?value.detail:undefined
      const safe=detail&&typeof detail==='object'?detail as {message?:unknown;fields?:unknown;dependencies?:unknown}:{}
      const fields=Array.isArray(safe.fields)?safe.fields.filter((v):v is string=>typeof v==='string'):[]
      const dependencies=Array.isArray(safe.dependencies)?safe.dependencies as ContentDependency[]:[]
      if(response.status===401&&!path.startsWith('/auth/login'))window.dispatchEvent(new Event('pivot-admin-expired'))
      throw new AdminApiError(typeof safe.message==='string'?safe.message:'This request could not be completed.',response.status,fields,dependencies)
    }
    return value as T
  } catch(error){
    if(error instanceof AdminApiError)throw error
    throw new AdminApiError('Unable to reach the agent service. Please try again.',0)
  } finally{clearTimeout(timeout)}
}
function keepSession(value:AdminSessionResponse){csrfToken=value.csrf_token;return value}
export const adminApi={
  me:()=>request<AdminSessionResponse>('/auth/me').then(keepSession),
  login:(email:string,password:string)=>request<AdminSessionResponse>('/auth/login','POST',{email,password}).then(keepSession),
  logout:async()=>{await request('/auth/logout','POST',{});csrfToken=''},
  catalog:()=>request<AdminCatalog>('/catalog'),
  get:(resource:AdminResource,id:string)=>request<AdminRecord>(`/${resource}/${encodeURIComponent(id)}`),
  save:(resource:AdminResource,body:Record<string,unknown>,id?:string)=>request<AdminRecord>(`/${resource}${id?'/'+encodeURIComponent(id):''}`,id?'PUT':'POST',body),
  status:(resource:AdminResource,row:AdminRecord,status:ContentStatus)=>request<AdminRecord>(`/${resource}/${encodeURIComponent(row.id)}/status`,'PATCH',{status,expected_updated_at:row.updated_at}),
  remove:(resource:AdminResource,id:string)=>request<{success:boolean}>(`/${resource}/${encodeURIComponent(id)}`,'DELETE'),
  dependencies:(resource:AdminResource,id:string)=>request<{dependencies:ContentDependency[]}>(`/${resource}/${encodeURIComponent(id)}/dependencies`),
  problems:()=>request<StudentProblem[]>('/problems'),
  updateProblem:(row:StudentProblem)=>request<StudentProblem>(`/problems/${encodeURIComponent(row.id)}`,'PUT',{title:row.title,description:row.description,academic_level:row.academic_level,category:row.category,priority:row.priority,status:row.status}),
  upload:async(kind:'image'|'pdf',file:File):Promise<{url:string;storage_type:'object'}>=>{
    const form=new FormData();form.append('file',file)
    const response=await fetch(`${API_BASE_URL}/api/admin/uploads/${kind}`,{method:'POST',body:form,credentials:'include',headers:{'X-Pivot-Admin':'1','X-CSRF-Token':csrfToken}})
    const value:unknown=await response.json()
    if(!response.ok){const detail=value&&typeof value==='object'&&'detail' in value?value.detail:undefined;throw new Error(detail&&typeof detail==='object'&&'message' in detail&&typeof detail.message==='string'?detail.message:'Unable to upload the file.')}
    return value as {url:string;storage_type:'object'}
  },
}
