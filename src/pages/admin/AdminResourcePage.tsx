import {useEffect,useRef,useState} from 'react'
import type {FormEvent} from 'react'
import {Link,useLocation,useNavigate,useParams} from 'react-router'
import type {AdminSection} from '../../config/adminFields'
import {newAdminValues} from '../../config/adminFields'
import {useAdminCatalog} from './AdminShell'
import {adminApi,AdminApiError} from '../../lib/adminApi'
import type {AdminCatalog,AdminRecord,ContentDependency,ContentStatus} from '../../types/admin'
import {textValue} from '../../types/admin'
import {AcademicPlacement,FormField,prepareAdminBody,recordTitle,relationLabel,SiteContentFields} from '../../components/admin/AdminForms'
import {AdminPreview} from '../../components/admin/AdminPreview'

function academicContext(row:AdminRecord,catalog:AdminCatalog){
  const parent=row.subject_id?catalog.subjects.find(item=>item.id===row.subject_id):row.lab_id?catalog.labs.find(item=>item.id===row.lab_id):row
  const semester=parent?.academic_level?parent:catalog.semesters.find(item=>item.id===parent?.semester_id)
  return {semester:semester?.id,branch:semester?.branch_id}
}
function RecordEditor({section,row,catalog}:{section:AdminSection;row?:AdminRecord;catalog:AdminCatalog}){
  const navigate=useNavigate()
  const {reload}=useAdminCatalog()
  const [values,setValues]=useState<Record<string,unknown>>(()=>row?{...row}:newAdminValues(section))
  const [error,setError]=useState('')
  const [fields,setFields]=useState<string[]>([])
  const [busy,setBusy]=useState(false)
  const [preview,setPreview]=useState(false)
  const pending=useRef(false)
  const update=(key:string,value:unknown)=>setValues(old=>({...old,[key]:value,...(key==='key'?{content_json:{}}:{}),...(key==='academic_level'&&value==='P1'?{branch_id:null}:{}),...(key==='pdf_url'?{storage_type:value?'external':null}:{})}))
  async function upload(file:File,kind:'image'|'pdf'){
    setBusy(true);setError('')
    try{const result=await adminApi.upload(kind,file);setValues(old=>({...old,[kind==='image'?'image_url':'pdf_url']:result.url,...(kind==='pdf'?{storage_type:'object'}:{})}))}
    catch(reason){setError(reason instanceof Error?reason.message:'Unable to upload file.')}finally{setBusy(false)}
  }
  async function save(event:FormEvent){
    event.preventDefault();if(pending.current)return;pending.current=true;setBusy(true);setError('');setFields([])
    try{
      await adminApi.save(section.resource,prepareAdminBody(values),row?.id)
      window.dispatchEvent(new Event('pivot-content-changed'))
      navigate(`/admin/${section.path}`,{state:{message:'Content saved successfully.'}})
      await reload()
    }catch(reason){setError(reason instanceof Error?reason.message:'Unable to save.');if(reason instanceof AdminApiError)setFields(reason.fields)}
    finally{pending.current=false;setBusy(false)}
  }
  const academic=['subjects','books','labs','experiments'].includes(section.resource)
  return <><div className="admin-page-heading"><div><Link className="pivot-back-link" to={`/admin/${section.path}`}>← {section.title}</Link><h1>{row?'Edit':'Add'} {section.singular}</h1><p className="admin-lead">Save incomplete content as a draft. Publish when it is ready for students.</p></div><button className="button button-secondary" onClick={()=>setPreview(value=>!value)}>{preview?'Return to editor':`Preview ${section.singular}`}</button></div>{preview?<AdminPreview section={section} values={values} catalog={catalog}/>:<form onSubmit={save} className="admin-editor"><fieldset disabled={busy}>{academic&&<AcademicPlacement resource={section.resource} values={values} catalog={catalog} onChange={update}/>}<div className="admin-form-grid">{section.fields.map(field=><FormField key={field.key} field={field} value={values[field.key]} onChange={value=>update(field.key,value)} catalog={catalog} disabled={field.key==='branch_id'&&values.academic_level==='P1'}/>)}</div>{section.resource==='faculty'&&<label className="admin-field">Upload faculty image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{const file=event.target.files?.[0];if(file)void upload(file,'image')}}/><span className="field-hint">JPG, PNG or WebP; maximum 5 MB. Configure durable object storage before uploading.</span></label>}{section.resource==='career-resources'&&<label className="admin-field">Upload PDF<input type="file" accept="application/pdf,.pdf" onChange={event=>{const file=event.target.files?.[0];if(file)void upload(file,'pdf')}}/><span className="field-hint">PDF; maximum 20 MB. An external HTTPS PDF URL can be pasted instead.</span></label>}{section.resource==='site-content'&&<SiteContentFields page={textValue(values.key)} value={values.content_json} onChange={value=>update('content_json',value)}/>}<div className="admin-publish-settings"><label>Status<select value={textValue(values.status)} onChange={e=>update('status',e.target.value)}><option value="draft">Draft</option><option value="published">Published</option>{row?.status==='archived'&&<option value="archived">Archived</option>}</select></label><label>Sort order<input type="number" min={0} max={100000} value={typeof values.sort_order==='number'?values.sort_order:0} onChange={e=>update('sort_order',Number(e.target.value))}/></label><p>Published changes become visible to students after saving.</p></div>{error&&<div className="admin-error" role="alert"><p>{error}</p>{fields.length>0&&<p>Check: {fields.map(field=>field.replaceAll('_',' ')).join(', ')}</p>}</div>}<div className="admin-editor-actions"><button className="button button-primary" type="submit">{busy?'Saving...':values.status==='published'?'Save and publish':'Save changes'}</button><Link className="button button-secondary" to={`/admin/${section.path}`}>Cancel</Link></div></fieldset></form>}</>
}

function ConfirmStatus({row,status,dependencies,busy,onConfirm,onCancel}:{row:AdminRecord;status:ContentStatus;dependencies:ContentDependency[];busy:boolean;onConfirm:()=>void;onCancel:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close()},[])
  const blocked=row.status==='published'&&dependencies.some(item=>item.published>0)
  return <dialog ref={dialog} className="admin-confirm" aria-labelledby="confirm-heading" onCancel={e=>{e.preventDefault();if(!busy)onCancel()}}><h2 id="confirm-heading">{status==='archived'?'Archive':'Unpublish'} {recordTitle(row)}?</h2><p>This hides the record from students. The saved content stays in the database.</p>{dependencies.length>0&&<><h3>Contains</h3><ul>{dependencies.map(item=><li key={item.resource}>{item.total} {item.resource.replaceAll('-',' ')} · {item.published} published</li>)}</ul></>}{blocked&&<p className="field-error">Unpublish or archive the published child records first.</p>}<div className="admin-row-actions"><button autoFocus type="button" className="button button-secondary" disabled={busy} onClick={onCancel}>Cancel</button><button type="button" className="button button-primary" disabled={busy||blocked} onClick={onConfirm}>{busy?'Updating...':status==='archived'?'Archive content':'Set to draft'}</button></div></dialog>
}

function ConfirmDelete({row,busy,onConfirm,onCancel}:{row:AdminRecord;busy:boolean;onConfirm:()=>void;onCancel:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close()},[])
  return <dialog ref={dialog} className="admin-confirm" aria-labelledby="delete-heading" onCancel={event=>{event.preventDefault();if(!busy)onCancel()}}><h2 id="delete-heading">Delete draft {recordTitle(row)}?</h2><p>This permanently removes this draft. Published or related content cannot be deleted here.</p><div className="admin-row-actions"><button autoFocus type="button" className="button button-secondary" disabled={busy} onClick={onCancel}>Cancel</button><button type="button" className="button button-primary" disabled={busy} onClick={onConfirm}>{busy?'Deleting...':'Delete draft'}</button></div></dialog>
}

export function AdminResourcePage({section}:{section:AdminSection}){
  const {id}=useParams()
  const location=useLocation()
  const {catalog,reload}=useAdminCatalog()
  const [query,setQuery]=useState('')
  const [status,setStatus]=useState('all')
  const [branch,setBranch]=useState('')
  const [semester,setSemester]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [confirm,setConfirm]=useState<{row:AdminRecord;status:ContentStatus;dependencies:ContentDependency[]}|null>(null)
  const [deleteCandidate,setDeleteCandidate]=useState<AdminRecord|null>(null)
  const pending=useRef(false)
  const resourceType=section.path==='career-domain-resources'?'domain':section.path==='career-job-resources'?'job':null
  const row=catalog[section.resource].find(item=>item.id===id&&(!resourceType||item.resource_type===resourceType))
  async function applyStatus(item:AdminRecord,next:ContentStatus){
    if(pending.current)return;pending.current=true;setBusy(true);setError('')
    try{await adminApi.status(section.resource,item,next);setConfirm(null);window.dispatchEvent(new Event('pivot-content-changed'));await reload()}
    catch(reason){setError(reason instanceof Error?reason.message:'Unable to update status.');setConfirm(null)}finally{pending.current=false;setBusy(false)}
  }
  async function change(item:AdminRecord,next:ContentStatus){
    if(busy)return
    if(next==='published'){await applyStatus(item,next);return}
    setBusy(true);setError('')
    try{const result=await adminApi.dependencies(section.resource,item.id);setConfirm({row:item,status:next,dependencies:result.dependencies})}
    catch(reason){setError(reason instanceof Error?reason.message:'Unable to check related content.')}
    finally{setBusy(false)}
  }
  async function remove(item:AdminRecord){
    if(pending.current)return;pending.current=true;setBusy(true);setError('')
    try{await adminApi.remove(section.resource,item.id);setDeleteCandidate(null);window.dispatchEvent(new Event('pivot-content-changed'));await reload()}
    catch(reason){setError(reason instanceof Error?reason.message:'Unable to delete this draft.');setDeleteCandidate(null)}finally{pending.current=false;setBusy(false)}
  }
  if(location.pathname.endsWith('/new'))return <RecordEditor key={`new-${section.resource}`} section={section} catalog={catalog}/>
  if(id){
    if(!row)return <div className="content-state"><h1>Content not found</h1><Link to={`/admin/${section.path}`}>Back to {section.title}</Link></div>
    if(location.pathname.endsWith('/preview'))return <><Link className="pivot-back-link" to={`/admin/${section.path}`}>← {section.title}</Link><AdminPreview section={section} values={row} catalog={catalog}/><Link className="button button-secondary" to={`/admin/${section.path}/${id}`}>Edit {section.singular}</Link></>
    return <RecordEditor key={id} section={section} row={row} catalog={catalog}/>
  }
  const rows=catalog[section.resource].filter(item=>{
    const context=academicContext(item,catalog)
    return (!resourceType||item.resource_type===resourceType)&&(status==='all'||item.status===status)&&(!branch||context.branch===branch)&&(!semester||context.semester===semester)&&`${recordTitle(item)} ${relationLabel(item,catalog)} ${JSON.stringify(item.authors??'')}`.toLowerCase().includes(query.trim().toLowerCase())
  })
  const academic=['semesters','subjects','books','labs','experiments'].includes(section.resource)
  const message=location.state&&typeof location.state==='object'&&'message' in location.state?String(location.state.message):''
  return <><div className="admin-page-heading"><div><p className="pivot-eyebrow">{section.group}</p><h1>{section.title}</h1><p className="admin-lead">Manage drafts, publish updates and keep previous content safely archived.</p></div><Link className="button button-primary" to={`/admin/${section.path}/new`}>+ Add {section.singular}</Link></div>{message&&<p className="contact-success" role="status">{message}</p>}<div className="admin-filters"><label>Search<input type="search" placeholder={`Search ${section.title.toLowerCase()}...`} value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>{academic&&<><label>Branch<select value={branch} onChange={e=>{setBranch(e.target.value);setSemester('')}}><option value="">All branches / P1</option>{catalog.branches.map(item=><option key={item.id} value={item.id}>{recordTitle(item)}</option>)}</select></label>{section.resource!=='semesters'&&<label>Semester<select value={semester} onChange={e=>setSemester(e.target.value)}><option value="">All semesters</option>{catalog.semesters.filter(item=>!branch||item.branch_id===branch).map(item=><option key={item.id} value={item.id}>{relationLabel(item,catalog)}</option>)}</select></label>}</>}</div>{error&&<p className="admin-error" role="alert">{error}</p>}<p className="field-hint" role="status">{rows.length} records</p>{rows.length?<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th scope="col">{section.singular}</th><th scope="col">Context</th><th scope="col">Status</th><th scope="col">Updated</th><th scope="col">Actions</th></tr></thead><tbody>{rows.map(item=><tr key={item.id}><td data-label={section.singular}><Link to={`/admin/${section.path}/${item.id}`}>{recordTitle(item)}</Link><small>{textValue(item.slug)}</small></td><td data-label="Context">{relationLabel(item,catalog)}</td><td data-label="Status"><span className={`admin-status ${item.status}`}>{item.status}</span></td><td data-label="Updated"><time dateTime={item.updated_at}>{new Date(item.updated_at).toLocaleDateString()}</time></td><td data-label="Actions"><div className="admin-row-actions"><Link to={`/admin/${section.path}/${item.id}`}>Edit</Link><Link to={`/admin/${section.path}/${item.id}/preview`}>Preview</Link><button type="button" disabled={busy} onClick={()=>void change(item,item.status==='published'?'draft':'published')}>{item.status==='published'?'Unpublish':'Publish'}</button>{item.status!=='archived'&&<button type="button" disabled={busy} onClick={()=>void change(item,'archived')}>Archive</button>}{item.status==='draft'&&['rooms','faculty-subjects','faculty','career-resources'].includes(section.resource)&&<button type="button" disabled={busy} onClick={()=>setDeleteCandidate(item)}>Delete draft</button>}</div></td></tr>)}</tbody></table></div>:<div className="content-state"><h2>No matching content</h2><p>Change the filters or add a new record.</p></div>}{confirm&&<ConfirmStatus {...confirm} busy={busy} onCancel={()=>setConfirm(null)} onConfirm={()=>void applyStatus(confirm.row,confirm.status)}/>} {deleteCandidate&&<ConfirmDelete row={deleteCandidate} busy={busy} onCancel={()=>setDeleteCandidate(null)} onConfirm={()=>void remove(deleteCandidate)}/>}</>
}
