import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { problemApi } from '../lib/problemApi'
import type { Priority, StudentProblem } from '../lib/problemApi'

const categories=['Academic','Hostel','Mess','Infrastructure','Internet','Transport','Other'] as const
export function ProblemCard({item,onReact}:{item:StudentProblem;onReact:(item:StudentProblem,reaction:'like'|'dislike')=>void}) {
  return <article className="directory-card"><h2>{item.title}</h2><p>{item.academic_level} · <strong>{item.priority.toUpperCase()} PRIORITY</strong>{item.category?` · ${item.category}`:''}</p><p>{item.description}</p><p><span className={`problem-status ${item.status}`}>{item.status.replace('_',' ').toUpperCase()}</span> · <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString()}</time></p><div className="directory-actions"><button type="button" onClick={()=>onReact(item,'like')} aria-label={`Like ${item.title}`}>👍 {item.likes}</button><button type="button" onClick={()=>onReact(item,'dislike')} aria-label={`Dislike ${item.title}`}>👎 {item.dislikes}</button></div></article>
}
export function ProblemsPage() {
  const {profile}=useAuth()
  const [items,setItems]=useState<StudentProblem[]>([])
  const [level,setLevel]=useState('')
  const [priority,setPriority]=useState('')
  const [status,setStatus]=useState('')
  const [category,setCategory]=useState('')
  const [sort,setSort]=useState('trending')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [showForm,setShowForm]=useState(false)
  const [title,setTitle]=useState('')
  const [description,setDescription]=useState('')
  const [formPriority,setFormPriority]=useState<Priority>('medium')
  const [formCategory,setFormCategory]=useState('')
  const reload=()=>{void problemApi.list({level,priority,status,category,sort}).then(setItems).catch(reason=>setError(reason instanceof Error?reason.message:'Unable to load reports.'))}
  useEffect(reload,[level,priority,status,category,sort])
  async function submit(event:React.FormEvent){
    event.preventDefault();if(!profile||busy)return
    setBusy(true);setError('')
    try{await problemApi.create({title,description,academic_level:profile.academicLevel,priority:formPriority,category:formCategory||null});setTitle('');setDescription('');setShowForm(false);reload()}
    catch(reason){setError(reason instanceof Error?reason.message:'Unable to report problem.')}finally{setBusy(false)}
  }
  async function react(item:StudentProblem,reaction:'like'|'dislike'){
    try{const updated=await problemApi.react(item.id,reaction);setItems(old=>old.map(row=>row.id===item.id?updated:row))}
    catch(reason){setError(reason instanceof Error?reason.message:'Verify your email again before voting.')}
  }
  return <div className="discovery-page"><header className="directory-heading"><p className="pivot-eyebrow">Student community</p><h1>Student Problems</h1><p>Report an issue and support problems that matter to students.</p><button className="button button-primary" type="button" onClick={()=>setShowForm(value=>!value)}>Report a Problem</button></header>
    {showForm&&<form className="problem-form" onSubmit={submit}><h2>Report a Problem</h2><label>Title<input required minLength={5} maxLength={200} value={title} onChange={event=>setTitle(event.target.value)}/></label><label>Description<textarea required minLength={20} maxLength={3000} value={description} onChange={event=>setDescription(event.target.value)}/></label><p>Academic level: {profile?.academicLevel}</p><label>Priority<select value={formPriority} onChange={event=>setFormPriority(event.target.value as Priority)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Category<select value={formCategory} onChange={event=>setFormCategory(event.target.value)}><option value="">Select category (optional)</option>{categories.map(value=><option key={value}>{value}</option>)}</select></label><button className="button button-primary" type="submit" disabled={busy}>{busy?'Publishing...':'Publish problem'}</button></form>}
    <div className="directory-filters problem-filters"><label>Academic level<select value={level} onChange={event=>setLevel(event.target.value)}><option value="">All</option><option>P1</option><option>E1</option></select></label><label>Priority<select value={priority} onChange={event=>setPriority(event.target.value)}><option value="">All</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><label>Status<select value={status} onChange={event=>setStatus(event.target.value)}><option value="">All</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option></select></label><label>Category<select value={category} onChange={event=>setCategory(event.target.value)}><option value="">All</option>{categories.map(value=><option key={value}>{value}</option>)}</select></label><label>Sort<select value={sort} onChange={event=>setSort(event.target.value)}><option value="trending">Trending</option><option value="newest">Newest</option><option value="priority">Priority</option></select></label></div>
    {error&&<p role="alert" className="admin-error">{error}</p>}{items.length?<div className="directory-grid">{items.map(item=><ProblemCard key={item.id} item={item} onReact={(row,reaction)=>void react(row,reaction)}/>)}</div>:<div className="content-state"><h2>No problems match these filters yet.</h2></div>}</div>
}
