import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Network, Search, Signpost } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ResourceCard } from '../components/dashboard/ResourceCard'
import { resourceDestinations } from '../config/studentNavigation'
import { DetailSection, DiscoveryHeader, SearchField } from '../components/resources/Discovery'
import { LocalSearchResults } from '../components/resources/LocalSearchResults'
import { buildLocalSearchIndex, searchLocalResources } from '../lib/localSearch'
import { useContent } from '../contexts/ContentContext'
import { ResourceEmptyState } from '../components/resources/books/ResourceEmptyState'

export const resourceFinderLinks = {
  Academic:[{title:'Reference Books',to:'/resources/books'}],
  Labs:[{title:'Lab Videos',to:'/resources/labs'}],
  Careers:[{title:'Career Domains',to:'/careers/domains'},{title:'Career Jobs',to:'/careers/jobs'}],
} as const
export function ResourceFinder() {
  const [choice,setChoice]=useState<keyof typeof resourceFinderLinks>('Academic')
  return <section id="resource-finder" className="discovery-section"><h2>Resource Finder</h2><fieldset className="discovery-filters"><legend>What are you looking for?</legend><div>{(Object.keys(resourceFinderLinks) as (keyof typeof resourceFinderLinks)[]).map(item=><button type="button" key={item} aria-pressed={choice===item} onClick={()=>setChoice(item)}>{item}</button>)}</div></fieldset><div className="discovery-inline-links" aria-live="polite">{resourceFinderLinks[choice].map(item=><Link key={item.to} to={item.to}>{item.title} →</Link>)}</div></section>
}
export function ExplorePage() {
  const {profile}=useAuth()
  const {data}=useContent()
  const [query,setQuery]=useState('')
  const level=profile?.academicLevel??'P1'
  const index=useMemo(()=>buildLocalSearchIndex(level,data.books,data.labs,data.domains,data.roles,data.branches),[level,data])
  const results=searchLocalResources(index,query)
  const content=data.site.explore
  if(!content)return <ResourceEmptyState title="Explore content is not published yet." description="Use the dashboard to browse available sections." />
  const cards=content.cards.flatMap(card=>{const base=resourceDestinations.find(item=>item.path===card.path);return base?[{...base,...card}]:[]})
  return <div className="discovery-page"><DiscoveryHeader title={content.title} description={content.description} /><div className="discovery-details">
    <DetailSection title={content.academic_title}><div className="discovery-grid discovery-two">{cards.filter(card=>card.path.startsWith('/resources/')).map(resource=><ResourceCard key={resource.path} resource={resource} />)}</div></DetailSection>
    <DetailSection title={content.careers_title}><div className="discovery-grid discovery-two">{cards.filter(card=>card.path.startsWith('/careers/')).map(resource=><ResourceCard key={resource.path} resource={resource} />)}</div></DetailSection>
    <DetailSection title={content.tools_title}><div className="discovery-tools"><a href="#quick-search"><Search size={21} aria-hidden="true" /><strong>Quick Search</strong><span>Find resources by name or skill.</span></a><Link to="/branches"><Network size={21} aria-hidden="true" /><strong>Branch Explorer</strong><span>Connect areas of study with careers.</span></Link><a href="#resource-finder"><Signpost size={21} aria-hidden="true" /><strong>Resource Finder</strong><span>Choose a starting point.</span></a></div></DetailSection>
    <section id="quick-search" className="discovery-section"><h2>Quick Search</h2><SearchField id="explore-search" label="Search Pivot Sols resources" placeholder="Search books, labs, careers..." query={query} onChange={setQuery} /><LocalSearchResults results={results} query={query} /></section>
    <ResourceFinder />
  </div></div>
}
