import {useEffect,useState} from 'react'
import {adminApi} from '../../lib/adminApi'
import type {StudentProblem,ProblemStatus} from '../../lib/problemApi'

export function AdminProblemsPage(){
  const [rows,setRows]=useState<StudentProblem[]>([])
  const [query,setQuery]=useState('')
  const [filter,setFilter]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [editing,setEditing]=useState<StudentProblem|null>(null)
  useEffect(()=>{void adminApi.problems().then(setRows).catch(reason=>setError(reason instanceof Error?reason.message:'Unable to load reports.'))},[])
  async function update(row:StudentProblem,status:ProblemStatus){
    setBusy(true);setError('')
    try{const saved=await adminApi.updateProblem({...row,status});setRows(old=>old.map(item=>item.id===saved.id?saved:item))}
    catch(reason){setError(reason instanceof Error?reason.message:'Unable to update report.')}finally{setBusy(false)}
  }
  async function saveEdit(event:React.FormEvent){
    event.preventDefault();if(!editing)return
    setBusy(true);setError('')
    try{const saved=await adminApi.updateProblem(editing);setRows(old=>old.map(item=>item.id===saved.id?saved:item));setEditing(null)}
    catch(reason){setError(reason instanceof Error?reason.message:'Unable to edit report.')}finally{setBusy(false)}
  }
  const shown=rows.filter(item=>(!filter||item.status===filter)&&`${item.title} ${item.description} ${item.category??''}`.toLowerCase().includes(query.toLowerCase()))
  return <div><div className="admin-page-heading"><div><p className="pivot-eyebrow">Community</p><h1>Student Problems</h1><p className="admin-lead">Review reports and update their status. Vote totals come only from student reactions.</p></div></div><div className="admin-filters"><label>Search<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search reports"/></label><label>Status<select value={filter} onChange={event=>setFilter(event.target.value)}><option value="">All statuses</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="archived">Archived</option></select></label></div>{error&&<p role="alert" className="admin-error">{error}</p>}{editing&&<form className="admin-editor" onSubmit={saveEdit}><h2>Edit report</h2><div className="admin-form-grid"><label>Title<input required minLength={5} maxLength={200} value={editing.title} onChange={event=>setEditing({...editing,title:event.target.value})}/></label><label>Description<textarea required minLength={20} maxLength={3000} value={editing.description} onChange={event=>setEditing({...editing,description:event.target.value})}/></label><label>Academic level<select value={editing.academic_level} onChange={event=>setEditing({...editing,academic_level:event.target.value as 'P1'|'E1'})}><option>P1</option><option>E1</option></select></label><label>Priority<select value={editing.priority} onChange={event=>setEditing({...editing,priority:event.target.value as StudentProblem['priority']})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Category<select value={editing.category??''} onChange={event=>setEditing({...editing,category:event.target.value||null})}><option value="">None</option>{['Academic','Hostel','Mess','Infrastructure','Internet','Transport','Other'].map(item=><option key={item}>{item}</option>)}</select></label><label>Status<select value={editing.status} onChange={event=>setEditing({...editing,status:event.target.value as ProblemStatus})}><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="archived">Archived</option></select></label></div><div className="admin-editor-actions"><button className="button button-primary" disabled={busy}>Save report</button><button className="button button-secondary" type="button" onClick={()=>setEditing(null)}>Cancel</button></div></form>}{shown.length?<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Problem</th><th>Level / Priority</th><th>Votes</th><th>Status</th><th>Update</th></tr></thead><tbody>{shown.map(row=><tr key={row.id}><td><strong>{row.title}</strong><p>{row.description}</p></td><td>{row.academic_level} · {row.priority}</td><td>{row.likes} likes · {row.dislikes} dislikes</td><td>{row.status.replace('_',' ')}</td><td><select aria-label={`Status for ${row.title}`} disabled={busy} value={row.status} onChange={event=>void update(row,event.target.value as ProblemStatus)}><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="archived">Archived</option></select> <button type="button" disabled={busy} onClick={()=>setEditing({...row})}>Edit</button></td></tr>)}</tbody></table></div>:<div className="content-state"><h2>No matching reports</h2></div>}</div>
}
