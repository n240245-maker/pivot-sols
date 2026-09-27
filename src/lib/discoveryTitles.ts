import type { PublicContent } from '../types/content'

export function discoveryTitle(pathname:string,data:PublicContent):string|undefined {
  const path=pathname.replace(/\/$/,'')
  const parts=path.split('/').filter(Boolean)
  if(path.startsWith('/careers/domains/'))return 'Career Domains · Pivot Sols'
  if(path.startsWith('/careers/jobs/'))return 'Career Jobs · Pivot Sols'
  if(path.startsWith('/branches/'))return `${parts.length===2?data.branches.find(b=>b.id===parts[1])?.shortName??'Branch not found':'Branch not found'} · Pivot Sols`
  return undefined
}
