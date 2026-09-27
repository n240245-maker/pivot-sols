import { API_BASE_URL } from '../config/api'

export type ProblemStatus = 'open'|'in_progress'|'resolved'|'archived'
export type Priority = 'low'|'medium'|'high'
export interface StudentProblem {id:string;title:string;description:string;academic_level:'P1'|'E1';category:string|null;priority:Priority;status:ProblemStatus;likes:number;dislikes:number;created_at:string;updated_at:string}
export type ProblemDraft = Pick<StudentProblem,'title'|'description'|'academic_level'|'category'|'priority'>
async function request<T>(path:string, method='GET', body?:unknown):Promise<T> {
  const response=await fetch(`${API_BASE_URL}${path}`,{method,credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json','X-Pivot-Student':'1'},...(body===undefined?{}:{body:JSON.stringify(body)})})
  const value:unknown=await response.json()
  if(!response.ok){const detail=value&&typeof value==='object'&&'detail' in value?value.detail:undefined;throw new Error(detail&&typeof detail==='object'&&'message' in detail&&typeof detail.message==='string'?detail.message:'The problem service could not complete this request.')}
  return value as T
}
export const problemApi={
  list:(filters:{level?:string;priority?:string;status?:string;category?:string;sort?:string}={})=>{
    const params=new URLSearchParams(Object.entries(filters).filter(([,value])=>Boolean(value)) as [string,string][])
    return request<StudentProblem[]>(`/api/public/problems?${params}`)
  },
  create:(body:ProblemDraft)=>request<StudentProblem>('/api/problems','POST',body),
  react:(id:string,reaction:'like'|'dislike')=>request<StudentProblem>(`/api/problems/${encodeURIComponent(id)}/reaction`,'POST',{reaction}),
}
