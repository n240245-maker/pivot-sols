import { Link } from 'react-router'
import { ArrowUpRight, Search } from 'lucide-react'
import type { SearchResult } from '../../types/search'

export function LocalSearchResults({results,query,onNavigate}:{results:readonly SearchResult[];query:string;onNavigate?:()=>void}) {
  if(!query.trim())return <div className="pivot-search-empty"><span className="books-icon"><Search size={24} aria-hidden="true" /></span><h3>Where would you like to start?</h3><p>Search a subject, experiment, room, faculty member or other resource. Results follow your academic level.</p></div>
  return <div className="local-search-results"><p className="discovery-result-count" role="status">{results.length?`${results.length} matching resources`:'No matching Pivot Sols resources found.'}</p>{!!results.length&&<ul>{results.map(result=><li key={result.id}><Link to={result.to} onClick={onNavigate}><span><span className="local-result-type">{result.type}</span><strong>{result.title}</strong><small>{result.context}</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link></li>)}</ul>}</div>
}
