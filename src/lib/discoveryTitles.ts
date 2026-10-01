import { findDomain, findRole } from './careers'
import type { PublicContent } from '../types/content'

export function discoveryTitle(pathname:string,data:PublicContent):string|undefined {
  const path=pathname.replace(/\/$/,'')
  const parts=path.split('/').filter(Boolean)
  if(path.startsWith('/careers/domains/'))return `${parts.length===3?findDomain(parts[2],data.domains)?.name??'Career domain not found':'Career domain not found'} · Pivot Sols`
  if(path.startsWith('/careers/jobs/'))return `${parts.length===3?findRole(parts[2],data.roles)?.name??'Career role not found':'Career role not found'} · Pivot Sols`
  if(path.startsWith('/branches/'))return `${parts.length===2?data.branches.find(b=>b.id===parts[1])?.shortName??'Branch not found':'Branch not found'} · Pivot Sols`
  return undefined
}
