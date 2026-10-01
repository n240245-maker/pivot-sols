import { useState } from 'react'
import { useContent } from '../contexts/ContentContext'
import { Link, useParams } from 'react-router'
import { domainPath, filterRoles, findDomain, findRole } from '../lib/careers'
import type { CareerCategory } from '../types/careers'
import { ResourceEmptyState } from '../components/resources/books/ResourceEmptyState'
import { BulletList, CategoryFilters, Chips, DetailSection, DiscoveryHeader, DiscoveryNotFound, Levels, PrototypeCareerNote, Roadmap, RoleCard, SearchField } from '../components/resources/Discovery'

export function CareerJobsPage() {
  const {data}=useContent()
  const {roleSlug}=useParams()
  const [query,setQuery]=useState('')
  const [category,setCategory]=useState<CareerCategory|'All'>('All')
  if(roleSlug) {
    const role=findRole(roleSlug,data.roles)
    if(!role) return <DiscoveryNotFound kind="Career role" to="/careers/jobs" />
    const domain=findDomain(role.domainSlug,data.domains)
    return <div className="discovery-page"><DiscoveryHeader title={role.name} description="Understand the work, build foundations and try a small project." parent={{label:'Career Jobs',to:'/careers/jobs'}} /><PrototypeCareerNote /><div className="discovery-details">
      <DetailSection title="What does this role do?"><p>{role.description}</p></DetailSection>
      <DetailSection title="Typical Responsibilities"><BulletList items={role.responsibilities} /></DetailSection>
      <div className="discovery-detail-grid"><DetailSection title="Skills Required"><Chips items={role.skills} /></DetailSection><DetailSection title="Useful Subjects"><Chips items={role.subjects} /></DetailSection><DetailSection title="Tools"><Chips items={role.tools} /></DetailSection><DetailSection title="Technologies"><Chips items={role.technologies} /></DetailSection></div>
      <DetailSection title="Learning profile"><Levels programming={role.programming} mathematics={role.mathematics} /></DetailSection>
      {domain&&<DetailSection title="Career Domain"><Link className="discovery-text-link" to={domainPath(domain.slug)}>{domain.name} <span aria-hidden="true">→</span></Link></DetailSection>}
      <DetailSection title="Learning Roadmap"><Roadmap stages={role.roadmap} /></DetailSection>
      <DetailSection title="Interview Topics"><Chips items={role.interviewTopics} /></DetailSection>
      <DetailSection title="Example Projects"><BulletList items={role.projects} /></DetailSection>
    </div></div>
  }
  const results=filterRoles(query,category,data.domains,data.roles)
  return <div className="discovery-page"><DiscoveryHeader title="Career Jobs" description="Understand engineering and technology roles. These are learning guides, not live job vacancies." /><PrototypeCareerNote /><SearchField id="role-search" label="Search career roles" placeholder="Search career roles..." query={query} onChange={setQuery} /><CategoryFilters value={category} onChange={setCategory} /><p className="discovery-result-count" role="status">{results.length} {results.length===1?'role':'roles'}</p>{results.length?<div className="discovery-grid">{results.map(role=><RoleCard key={role.id} role={role} />)}</div>:<ResourceEmptyState title="No matching career roles found." description="Try another search or choose All categories." />}</div>
}
