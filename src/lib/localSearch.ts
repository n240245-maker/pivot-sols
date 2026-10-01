import type { CareerDomain, CareerRole } from '../types/careers'
import type { BranchGuide } from '../types/content'
import { resourceDestinations } from '../config/studentNavigation'
import { booksPath } from './referenceBooks'
import { labsPath } from './labVideos'
import { domainPath, rolePath } from './careers'
import type { SearchResult } from '../types/search'
import type { SupportedAcademicLevel } from '../types/student'
import type { ReferenceCatalog } from '../types/referenceBooks'
import type { LabCatalog } from '../types/labVideos'

export function buildLocalSearchIndex(level:SupportedAcademicLevel,books:ReferenceCatalog,labs:LabCatalog,careerDomains:readonly CareerDomain[],careerRoles:readonly CareerRole[],branchGuides:readonly BranchGuide[]):readonly SearchResult[] {
  const results:SearchResult[]=[]
  for(const subject of books.subjects) {
    const curriculum=books.curricula.find(c=>c.id===subject.curriculumId&&c.level===level)
    const semester=curriculum?.semesters.find(s=>s.id===subject.semesterId)
    if(!curriculum||!semester)continue
    const context=[level,curriculum.branch?.shortName,semester.name].filter(Boolean).join(' · ')
    const to=booksPath(curriculum,semester,subject)
    results.push({id:`subject:${subject.id}`,title:subject.name,type:'Subject',context,to,keywords:subject.code??''})
    for(const book of books.books.filter(b=>b.subjectId===subject.id)) results.push({id:`book:${book.id}`,title:book.title,type:'Book',context:`${subject.name} · ${context}`,to,keywords:[...book.authors,book.description??'',subject.name].join(' ')})
  }
  for(const lab of labs.labs) {
    const curriculum=labs.curricula.find(c=>c.id===lab.curriculumId&&c.level===level)
    const semester=curriculum?.semesters.find(s=>s.id===lab.semesterId)
    if(!curriculum||!semester)continue
    const context=[level,curriculum.branch?.shortName,semester.name].filter(Boolean).join(' · ')
    results.push({id:`lab:${lab.id}`,title:lab.name,type:'Lab',context,to:labsPath(curriculum,semester,lab),keywords:lab.shortDescription??''})
    for(const experiment of lab.experiments) results.push({id:`experiment:${lab.id}:${experiment.id}`,title:experiment.title,type:'Experiment',context:`${lab.name} · ${context}`,to:labsPath(curriculum,semester,lab,experiment),keywords:lab.name})
  }
  for(const domain of careerDomains) results.push({id:`domain:${domain.id}`,title:domain.name,type:'Career Domain',context:domain.category,to:domainPath(domain.slug),keywords:[...domain.skills,...domain.tools,...domain.roleIds.flatMap(id=>careerRoles.find(role=>role.id===id)?.name??[])].join(' ')})
  for(const role of careerRoles) results.push({id:`role:${role.id}`,title:role.name,type:'Career Role',context:careerDomains.find(d=>d.slug===role.domainSlug)?.name??'',to:rolePath(role.slug),keywords:[...role.skills,...role.tools,...role.technologies].join(' ')})
  for(const branch of branchGuides) results.push({id:`branch:${branch.id}`,title:branch.name,type:'Branch',context:branch.shortName??'',to:`/branches/${branch.id}`,keywords:[...branch.areas,branch.id].join(' ')})
  for(const section of resourceDestinations) results.push({id:`section:${section.path}`,title:section.title,type:'Section',context:'Pivot Sols',to:section.path,keywords:section.description})
  return results
}
export function searchLocalResources(index:readonly SearchResult[],query:string):readonly SearchResult[] {
  const terms=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  if(!terms.length)return []
  return index.filter(item=>terms.every(term=>`${item.title} ${item.type} ${item.context} ${item.keywords}`.toLocaleLowerCase().includes(term))).sort((a,b)=>Number(b.title.toLocaleLowerCase()===query.trim().toLocaleLowerCase())-Number(a.title.toLocaleLowerCase()===query.trim().toLocaleLowerCase()))
}
