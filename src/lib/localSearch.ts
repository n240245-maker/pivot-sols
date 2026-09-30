import type { CareerDomain, CareerRole } from '../types/careers'
import type { BranchGuide, CareerResource, InformationRoom, FacultyMember, FacultySubject } from '../types/content'
import { resourcesForLevel } from '../config/studentNavigation'
import { booksPath } from './referenceBooks'
import { labsPath } from './labVideos'
import type { SearchResult } from '../types/search'
import type { SupportedAcademicLevel } from '../types/student'
import type { ReferenceCatalog } from '../types/referenceBooks'
import type { LabCatalog } from '../types/labVideos'

export function buildLocalSearchIndex(level:SupportedAcademicLevel,books:ReferenceCatalog,labs:LabCatalog,_careerDomains:readonly CareerDomain[],_careerRoles:readonly CareerRole[],branchGuides:readonly BranchGuide[],careerResources:readonly CareerResource[]=[],rooms:readonly InformationRoom[]=[],faculty:readonly FacultyMember[]=[],facultySubjects:readonly FacultySubject[]=[]):readonly SearchResult[] {
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
  if(level==='P1') for(const lab of labs.labs) {
    const curriculum=labs.curricula.find(c=>c.id===lab.curriculumId&&c.level===level)
    const semester=curriculum?.semesters.find(s=>s.id===lab.semesterId)
    if(!curriculum||!semester)continue
    const context=[level,curriculum.branch?.shortName,semester.name].filter(Boolean).join(' · ')
    results.push({id:`lab:${lab.id}`,title:lab.name,type:'Lab',context,to:labsPath(curriculum,semester,lab),keywords:lab.shortDescription??''})
    for(const experiment of lab.experiments) results.push({id:`experiment:${lab.id}:${experiment.id}`,title:experiment.title,type:'Experiment',context:`${lab.name} · ${context}`,to:labsPath(curriculum,semester,lab,experiment),keywords:lab.name})
  }
  if(level==='E1') {
    for(const resource of careerResources) results.push({id:`career-resource:${resource.id}`,title:resource.title,type:resource.resource_type==='domain'?'Career Domain Resource':'Career Job Resource',context:branchGuides.find(branch=>branch.id===resource.branch_id)?.name??'',to:`/careers/${resource.resource_type==='domain'?'domains':'jobs'}?branch=${encodeURIComponent(resource.branch_id)}`,keywords:[resource.description,...resource.tags].join(' ')})
    for(const branch of branchGuides) results.push({id:`branch:${branch.id}`,title:branch.name,type:'Branch',context:branch.shortName??'',to:`/branches/${branch.id}`,keywords:[...branch.areas,branch.id].join(' ')})
  } else {
    for(const room of rooms) results.push({id:`room:${room.id}`,title:room.name,type:'I3 Block Room',context:room.room_number,to:'/campus/rooms',keywords:`${room.phone_number} ${room.floor} ${room.description}`})
    for(const subject of facultySubjects) results.push({id:`faculty-subject:${subject.id}`,title:subject.name,type:'Faculty Subject',context:'Faculty Directory',to:'/faculty',keywords:''})
    for(const member of faculty) results.push({id:`faculty:${member.id}`,title:member.name,type:'Faculty Member',context:facultySubjects.find(subject=>subject.id===member.subject_id)?.name??'',to:'/faculty',keywords:`${member.designation} ${member.room_number}`})
  }
  for(const section of resourcesForLevel(level)) results.push({id:`section:${section.path}`,title:section.title,type:'Section',context:'Pivot Sols',to:section.path,keywords:section.description})
  return results
}
export function searchLocalResources(index:readonly SearchResult[],query:string):readonly SearchResult[] {
  const terms=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  if(!terms.length)return []
  return index.filter(item=>terms.every(term=>`${item.title} ${item.type} ${item.context} ${item.keywords}`.toLocaleLowerCase().includes(term))).sort((a,b)=>Number(b.title.toLocaleLowerCase()===query.trim().toLocaleLowerCase())-Number(a.title.toLocaleLowerCase()===query.trim().toLocaleLowerCase()))
}
