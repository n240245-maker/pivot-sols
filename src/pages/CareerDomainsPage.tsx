import { useState } from 'react'
import { useParams } from 'react-router'
import { useContent } from '../contexts/ContentContext'
import { filterDomains, findDomain } from '../lib/careers'
import type { CareerCategory } from '../types/careers'
import { ResourceEmptyState } from '../components/resources/books/ResourceEmptyState'
import { BulletList, CategoryFilters, Chips, DetailSection, DiscoveryHeader, DiscoveryNotFound, DomainCard, Levels, PrototypeCareerNote, Roadmap, RoleCard, SearchField } from '../components/resources/Discovery'

export function CareerDomainsPage() {
  const {data}=useContent()
  const careerRoles=data.roles
  const {domainSlug}=useParams()
  const [query,setQuery]=useState('')
  const [category,setCategory]=useState<CareerCategory|'All'>('All')
  if(domainSlug) {
    const domain=findDomain(domainSlug,data.domains)
    if(!domain) return <DiscoveryNotFound kind="Career domain" to="/careers/domains" />
    const roles=domain.roleIds.flatMap(id=>careerRoles.find(role=>role.id===id) ?? [])
    return <div className="discovery-page"><DiscoveryHeader title={domain.name} description={domain.description} parent={{label:'Career Domains',to:'/careers/domains'}} /><PrototypeCareerNote /><div className="discovery-details">
      <DetailSection title="Overview"><p>{domain.overview}</p></DetailSection>
      {!!domain.supportingSkills?.length&&<DetailSection title="Supporting Skills"><Chips items={domain.supportingSkills} /></DetailSection>}
      {!!domain.challenges?.length&&<DetailSection title="Challenges"><BulletList items={domain.challenges} /></DetailSection>}
      <DetailSection title="What you'll work on"><BulletList items={domain.work} /></DetailSection>
      <div className="discovery-detail-grid"><DetailSection title="Core Skills"><Chips items={domain.skills} /></DetailSection><DetailSection title="Useful Subjects"><Chips items={domain.subjects} /></DetailSection><DetailSection title="Tools & Technologies"><Chips items={domain.tools} /></DetailSection><DetailSection title="Learning profile"><Levels programming={domain.programming} mathematics={domain.mathematics} /></DetailSection></div>
      <DetailSection title="Who may enjoy this?"><p>You may enjoy this domain if you like:</p><Chips items={domain.interests} /></DetailSection>
      <DetailSection title="Related Roles"><div className="discovery-grid">{roles.map(role=><RoleCard key={role.id} role={role} />)}</div></DetailSection>
      <DetailSection title="Roadmap"><Roadmap stages={domain.roadmap} /></DetailSection>
    </div></div>
  }
  const results=filterDomains(query,category,data.domains,data.roles)
  return <div className="discovery-page"><DiscoveryHeader title="Career Domains" description="Explore fields, connect them to your interests and find a place to begin." /><PrototypeCareerNote /><SearchField id="domain-search" label="Search career domains" placeholder="Search career domains..." query={query} onChange={setQuery} /><CategoryFilters value={category} onChange={setCategory} /><p className="discovery-result-count" role="status">{results.length} {results.length===1?'domain':'domains'}</p>{results.length?<div className="discovery-grid">{results.map(domain=><DomainCard key={domain.id} domain={domain} />)}</div>:<ResourceEmptyState title="No matching career domains found." description="Try another search or choose All categories." />}</div>
}
