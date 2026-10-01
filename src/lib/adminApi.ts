import {API_BASE_URL} from '../config/api'
import type {AdminCatalog,AdminChallenge,AdminRecord,AdminResource,AdminSessionResponse,ContentDependency,ContentStatus} from '../types/admin'

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
      if(response.status===401&&!path.startsWith('/auth/login')&&!path.startsWith('/auth/verify')&&!path.startsWith('/auth/resend'))window.dispatchEvent(new Event('pivot-admin-expired'))
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
  login:(email:string,password:string)=>request<AdminChallenge>('/auth/login','POST',{email,password}),
  verify:(challenge:string,otp:string)=>request<AdminSessionResponse>('/auth/verify','POST',{challenge,otp}).then(keepSession),
  resend:(challenge:string)=>request<AdminChallenge>('/auth/resend','POST',{challenge}),
  logout:async()=>{await request('/auth/logout','POST',{});csrfToken=''},
  catalog:()=>request<AdminCatalog>('/catalog'),
  get:(resource:AdminResource,id:string)=>request<AdminRecord>(`/${resource}/${encodeURIComponent(id)}`),
  save:(resource:AdminResource,body:Record<string,unknown>,id?:string)=>request<AdminRecord>(`/${resource}${id?'/'+encodeURIComponent(id):''}`,id?'PUT':'POST',body),
  status:(resource:AdminResource,row:AdminRecord,status:ContentStatus)=>request<AdminRecord>(`/${resource}/${encodeURIComponent(row.id)}/status`,'PATCH',{status,expected_updated_at:row.updated_at}),
  dependencies:(resource:AdminResource,id:string)=>request<{dependencies:ContentDependency[]}>(`/${resource}/${encodeURIComponent(id)}/dependencies`),
}
