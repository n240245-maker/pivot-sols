import { useSearchParams } from 'react-router'
import { useContent } from '../contexts/ContentContext'
import type { CareerResource } from '../types/content'

export function CareerResourceLibrary({type}:{type:'domain'|'job'}) {
  const { data } = useContent()
  const [params,setParams] = useSearchParams()
  const selected = data.branches.find(branch => branch.id === params.get('branch')) ?? data.branches[0]
  const resources = (data.career_resources ?? []).filter(item => item.resource_type === type && item.branch_id === selected?.id)
  const title = type === 'domain' ? 'Career Domains' : 'Career Jobs'
  return <div className="discovery-page"><header className="directory-heading"><p className="pivot-eyebrow">E1 resource library</p><h1>{title}</h1><p>Select any branch to browse published resources.</p></header>
    {data.branches.length > 0 && <div className="directory-tabs" role="tablist" aria-label={`${title} branches`}>{data.branches.map(branch => <button key={branch.id} role="tab" aria-selected={selected?.id === branch.id} type="button" onClick={() => setParams({branch:branch.id})}>{branch.shortName || branch.name}</button>)}</div>}
    {resources.length ? <div className="directory-grid">{resources.map(item => <CareerResourceCard key={item.id} item={item} branch={selected?.name ?? ''} />)}</div>
      : <div className="content-state"><h2>No resources have been published for this branch yet.</h2></div>}</div>
}
function CareerResourceCard({item,branch}:{item:CareerResource;branch:string}) {
  return <article className="directory-card"><h2>{item.title}</h2><p>{branch}</p>{item.description && <p>{item.description}</p>}{item.tags.length > 0 && <p className="directory-tags">{item.tags.join(' · ')}</p>}<p><small>Updated {new Date(item.updated_at).toLocaleDateString()}</small></p><div className="directory-actions">{item.pdf_url && <a href={item.pdf_url} target="_blank" rel="noopener noreferrer">View PDF</a>}{item.pdf_url && item.storage_type === 'object' && <a href={item.pdf_url} download>Download PDF</a>}{item.supporting_url && <a href={item.supporting_url} target="_blank" rel="noopener noreferrer">Supporting link</a>}</div></article>
}
