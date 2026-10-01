import { ArrowLeft, MoveUpRight } from 'lucide-react'
import { Link } from 'react-router'
import {useContent} from '../contexts/ContentContext'
import {ResourceEmptyState} from '../components/resources/books/ResourceEmptyState'

export function AboutPage() {
  const {data}=useContent()
  const content=data.site.about
  if(!content)return <ResourceEmptyState title="About content is not published yet." description="Return to the dashboard to explore available resources." />
  return <div className="pivot-editorial-page">
    <Link to="/dashboard" className="pivot-back-link"><ArrowLeft size={16} aria-hidden="true" />Back to dashboard</Link>
    <p className="pivot-eyebrow">{content.eyebrow}</p><h1>{content.title}</h1>
    <p className="pivot-about-intro">{content.intro}</p>
    <section className="discovery-section"><h2>{content.why_title}</h2><div className="discovery-detail-grid">{content.why.map((item,index)=><div key={index}><h3>{item.title}</h3><p>{item.description}</p></div>)}</div></section>
    <section className="pivot-mission"><span className="liquid-glass"><MoveUpRight size={25} strokeWidth={1.5} aria-hidden="true" /></span><div><h2>{content.goal_title}</h2><p>{content.goal}</p></div></section>
  </div>
}
