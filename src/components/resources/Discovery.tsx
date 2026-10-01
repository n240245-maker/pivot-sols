import { Link } from 'react-router'
import { ArrowLeft, ArrowUpRight, Braces, BrainCircuit, Cpu, Network, ShieldCheck, Wrench, Zap, Search, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { CareerCategory, CareerDomain, CareerRole, LearningLevel, RoadmapStage } from '../../types/careers'
import { careerCategories } from '../../types/careers'
import { domainPath, findDomain, rolePath } from '../../lib/careers'
import { ResourceBreadcrumbs } from './books/ResourceBreadcrumbs'
import { ResourceEmptyState } from './books/ResourceEmptyState'
import { useContent } from '../../contexts/ContentContext'

const icons: Record<CareerCategory,LucideIcon> = {Software:Braces,'AI & Data':BrainCircuit,Hardware:Cpu,Electronics:Zap,Infrastructure:Network,Security:ShieldCheck,'Core Engineering':Wrench}
export function DiscoveryHeader({title,description,parent,eyebrow='Find your next direction'}:{title:string;description:string;parent?:{label:string;to:string};eyebrow?:string}) {
  return <><ResourceBreadcrumbs items={parent?[{label:parent.label,to:parent.to},{label:title}]:[{label:title}]} /><Link to={parent?.to ?? '/dashboard'} className="pivot-back-link"><ArrowLeft size={16} aria-hidden="true" />Back to {parent?.label ?? 'dashboard'}</Link><header className="books-heading"><p className="pivot-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="books-intro">{description}</p></header></>
}
export function PrototypeCareerNote() {return <aside className="books-demo"><strong>Career guides</strong><span>Introductory prototype content. Programming and mathematics levels describe typical learning needs, not rankings, eligibility or hiring requirements.</span></aside>}
export function Chips({items}:{items:readonly string[]}) {return <ul className="discovery-chips">{items.map(item=><li key={item}>{item}</li>)}</ul>}
export function Levels({programming,mathematics}:{programming:LearningLevel;mathematics:LearningLevel}) {return <dl className="discovery-levels"><div><dt>Programming</dt><dd>{programming}</dd></div><div><dt>Mathematics</dt><dd>{mathematics}</dd></div></dl>}
export function DomainCard({domain}:{domain:CareerDomain}) {
  const Icon=icons[domain.category]
  return <Link className="discovery-card" to={domainPath(domain.slug)}><div className="discovery-card-top"><span className="books-icon"><Icon size={23} aria-hidden="true" /></span><span>{domain.category}</span></div><h3>{domain.name}</h3><p>{domain.description}</p><Chips items={domain.skills.slice(0,4)} /><span className="discovery-card-action">Explore <ArrowUpRight size={17} aria-hidden="true" /></span></Link>
}
export function RoleCard({role}:{role:CareerRole}) {
  const {data}=useContent()
  const domain=findDomain(role.domainSlug,data.domains)
  return <Link className="discovery-card" to={rolePath(role.slug)}><span className="discovery-category">{domain?.name}</span><h3>{role.name}</h3><p>{role.description}</p><Levels programming={role.programming} mathematics={role.mathematics} /><span className="discovery-card-action">Explore Role <ArrowUpRight size={17} aria-hidden="true" /></span></Link>
}
export function SearchField({id,label,placeholder,query,onChange}:{id:string;label:string;placeholder:string;query:string;onChange:(value:string)=>void}) {
  return <div className="books-search"><label htmlFor={id}>{label}</label><div><Search size={18} aria-hidden="true" /><input id={id} type="search" placeholder={placeholder} value={query} onChange={e=>onChange(e.target.value)} autoComplete="off" />{query&&<button type="button" aria-label="Clear search" onClick={()=>onChange('')}><X size={17} aria-hidden="true" /></button>}</div></div>
}
export function CategoryFilters({value,onChange}:{value:CareerCategory|'All';onChange:(value:CareerCategory|'All')=>void}) {
  return <fieldset className="discovery-filters"><legend>Filter by category</legend><div>{(['All',...careerCategories] as const).map(category=><button key={category} type="button" aria-pressed={value===category} onClick={()=>onChange(category)}>{category}</button>)}</div></fieldset>
}
export function DetailSection({title,children}:{title:string;children:ReactNode}) {return <section className="discovery-section"><h2>{title}</h2>{children}</section>}
export function BulletList({items}:{items:readonly string[]}) {return <ul className="discovery-list">{items.map(item=><li key={item}>{item}</li>)}</ul>}
export function Roadmap({stages}:{stages:readonly RoadmapStage[]}) {return <ol className="discovery-roadmap">{stages.map((stage,index)=><li key={stage.title}><span aria-hidden="true">{String(index+1).padStart(2,'0')}</span><div><h3>{stage.title}</h3><p>{stage.description}</p></div></li>)}</ol>}
export function DiscoveryNotFound({kind,to}:{kind:string;to:string}) {return <div className="discovery-page"><ResourceEmptyState title={`${kind} not found`} description="This guide is not available. Browse the current collection to find another path." /><Link to={to} className="pivot-back-link"><ArrowLeft size={16} aria-hidden="true" />Back to {kind==='Branch'?'Branches':kind==='Career domain'?'Career Domains':'Career Jobs'}</Link></div>}
