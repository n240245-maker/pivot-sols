import { Link, useParams } from 'react-router'
import { Network } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useContent } from '../contexts/ContentContext'
import { Chips, DetailSection, DiscoveryHeader, DiscoveryNotFound, DomainCard, RoleCard } from '../components/resources/Discovery'
import { SelectionCard } from '../components/resources/books/SelectionCard'
import type { SupportedAcademicLevel } from '../types/student'

export function branchAcademicLinks(branchId:string,level:SupportedAcademicLevel) {
  return level==='E1' ? {books:`/resources/books/e1/${branchId}`,labs:`/resources/labs/e1/${branchId}`} : {books:'/resources/books',labs:'/resources/labs'}
}
export function BranchesPage() {
  const {data}=useContent()
  const {branches:branchGuides,domains:careerDomains,roles:careerRoles}=data
  const {profile}=useAuth()
  const {branchSlug}=useParams()
  const branch=branchGuides.find(item=>item.id===branchSlug)
  if(branchSlug&&!branch) return <DiscoveryNotFound kind="Branch" to="/branches" />
  if(branch) {
    const domains=careerDomains.filter(item=>branch.domainSlugs.includes(item.slug))
    const roles=careerRoles.filter(item=>branch.roleIds.includes(item.id))
    const links=branchAcademicLinks(branch.id,profile?.academicLevel ?? 'P1')
    return <div className="discovery-page"><DiscoveryHeader title={branch.name} description={branch.shortName ?? branch.name} parent={{label:'Branches',to:'/branches'}} /><aside className="books-demo"><strong>Branch guide</strong><span>A broad prototype overview, not the official RGUKT curriculum. Career links are starting points, not exclusive paths.</span></aside><div className="discovery-details"><DetailSection title="What is this branch?"><p>{branch.overview}</p></DetailSection><DetailSection title="Major Areas"><Chips items={branch.areas} /></DetailSection><DetailSection title="Relevant Career Domains"><div className="discovery-grid">{domains.map(domain=><DomainCard key={domain.id} domain={domain} />)}</div></DetailSection><DetailSection title="Relevant Career Roles"><div className="discovery-grid">{roles.map(role=><RoleCard key={role.id} role={role} />)}</div></DetailSection><DetailSection title="Academic Resources"><p>{profile?.academicLevel==='P1'?'Your P1 academic resources begin with semesters.':'Browse the current resources for this branch.'}</p><div className="discovery-inline-links"><Link to={links.books}>Reference Books →</Link><Link to={links.labs}>Lab Videos →</Link></div></DetailSection></div></div>
  }
  return <div className="discovery-page"><DiscoveryHeader title="All Branches" description="Get to know each branch and see where its ideas can lead." /><aside className="books-demo"><strong>Prototype branch guides</strong><span>Explore broad areas of study and related paths. These guides do not define the official RGUKT syllabus.</span></aside><div className="books-grid books-branch-grid">{branchGuides.map(item=><SelectionCard key={item.id} to={`/branches/${item.id}`} title={item.shortName ?? item.name} detail={item.name} icon={Network} />)}</div></div>
}
