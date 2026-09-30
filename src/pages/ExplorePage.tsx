import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Network, Search, Signpost } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ResourceCard } from '../components/dashboard/ResourceCard'
import { resourcesForLevel } from '../config/studentNavigation'
import { DetailSection, DiscoveryHeader, SearchField } from '../components/resources/Discovery'
import { LocalSearchResults } from '../components/resources/LocalSearchResults'
import { buildLocalSearchIndex, searchLocalResources } from '../lib/localSearch'
import { useContent } from '../contexts/ContentContext'
import { ResourceEmptyState } from '../components/resources/books/ResourceEmptyState'

export const resourceFinderLinks = {
  Academic:[{title:'Reference Books',to:'/resources/books'}],
  Labs:[{title:'Lab Videos',to:'/resources/labs'}],
  Careers:[{title:'Career Domains',to:'/careers/domains'},{title:'Career Jobs',to:'/careers/jobs'}],
  Campus:[{title:'I3 Block Rooms',to:'/campus/rooms'},{title:'Faculty Directory',to:'/faculty'}],
} as const
export function ResourceFinder({level='E1'}:{level?:'P1'|'E1'}={}) {
  const choices=level==='P1'?(['Academic','Labs','Campus'] as const):(['Academic','Careers'] as const)
  const [choice,setChoice]=useState<string>('Academic')
  const visibleChoice=choices.find(item=>item===choice)??'Academic'
  return <section id="resource-finder" className="discovery-section"><h2>Resource Finder</h2><fieldset className="discovery-filters"><legend>What are you looking for?</legend><div>{choices.map(item=><button type="button" key={item} aria-pressed={visibleChoice===item} onClick={()=>setChoice(item)}>{item}</button>)}</div></fieldset><div className="discovery-inline-links" aria-live="polite">{resourceFinderLinks[visibleChoice].map(item=><Link key={item.to} to={item.to}>{item.title} →</Link>)}</div></section>
}
export function ExplorePage() {
  const {profile}=useAuth()
  const {data}=useContent()
  const [query,setQuery]=useState('')
  const level=profile?.academicLevel??'P1'
  const index=useMemo(()=>buildLocalSearchIndex(level,data.books,data.labs,data.domains,data.roles,data.branches,data.career_resources,data.rooms,data.faculty,data.faculty_subjects),[level,data])
  const results=searchLocalResources(index,query)
  const content=data.site.explore
  if(!content)return <ResourceEmptyState title="Explore content is not published yet." description="Use the dashboard to browse available sections." />
  const destinations=resourcesForLevel(level)
  const cards=destinations.map(base=>({...base,...content.cards.find(card=>card.path===base.path)}))
  return <div className="discovery-page"><DiscoveryHeader title={content.title} description={content.description} /><div className="discovery-details">
    <DetailSection title={content.academic_title}><div className="discovery-grid discovery-two">{cards.filter(card=>card.path.startsWith('/resources/')).map(resource=><ResourceCard key={resource.path} resource={resource} />)}</div></DetailSection>
    <DetailSection title={level==='P1'?'Campus and faculty':content.careers_title}><div className="discovery-grid discovery-two">{cards.filter(card=>level==='P1'?['/campus/rooms','/faculty'].includes(card.path):card.path.startsWith('/careers/')).map(resource=><ResourceCard key={resource.path} resource={resource} />)}</div></DetailSection>
    <DetailSection title={content.tools_title}><div className="discovery-tools"><a href="#quick-search"><Search size={21} aria-hidden="true" /><strong>Quick Search</strong><span>Find resources by name or skill.</span></a>{level==='E1'?<Link to="/branches"><Network size={21} aria-hidden="true" /><strong>Branch Explorer</strong><span>Explore every branch.</span></Link>:<Link to="/faculty"><Network size={21} aria-hidden="true" /><strong>Faculty Directory</strong><span>Find faculty by subject.</span></Link>}<a href="#resource-finder"><Signpost size={21} aria-hidden="true" /><strong>Resource Finder</strong><span>Choose a starting point.</span></a></div></DetailSection>
    <section id="quick-search" className="discovery-section"><h2>Quick Search</h2><SearchField id="explore-search" label="Search Pivot Sols resources" placeholder={level==='P1'?'Search books, labs, rooms, faculty...':'Search books and careers...'} query={query} onChange={setQuery} /><LocalSearchResults results={results} query={query} /></section>
    <ResourceFinder level={level} />
  </div></div>
}
