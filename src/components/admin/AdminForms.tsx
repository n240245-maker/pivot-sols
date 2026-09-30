import {useState} from 'react'
import type {AdminField} from '../../config/adminFields'
import type {AdminCatalog,AdminRecord,AdminResource} from '../../types/admin'
import {stringsValue,textValue} from '../../types/admin'

export const recordTitle=(row:AdminRecord)=>textValue(row.name)||textValue(row.title)||textValue(row.key)||'Untitled'
export const objectValue=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{}
export function relationLabel(row:AdminRecord,catalog:AdminCatalog):string {
  const parent=row.subject_id?catalog.subjects.find(item=>item.id===row.subject_id):row.lab_id?catalog.labs.find(item=>item.id===row.lab_id):undefined
  const academic=parent??row
  const semester=typeof academic.semester_id==='string'?catalog.semesters.find(s=>s.id===academic.semester_id):academic.academic_level?academic:undefined
  const branch=semester?catalog.branches.find(b=>b.id===semester.branch_id):undefined
  const domain=row.domain_id?catalog['career-domains'].find(item=>item.id===row.domain_id):undefined
  return [parent?recordTitle(parent):recordTitle(row),semester&&semester!==row?recordTitle(semester):'',branch?textValue(branch.short_name)||recordTitle(branch):semester?textValue(semester.academic_level):'',domain?recordTitle(domain):'',row.status==='published'?'':`(${row.status})`].filter(Boolean).join(' · ')
}

export function RepeatableStrings({label,value,onChange}:{label:string;value:unknown;onChange:(value:string[])=>void}){
  const items=stringsValue(value)
  return <fieldset className="admin-repeat"><legend>{label}</legend>{items.map((item,index)=><div className="admin-repeat-row" key={index}><input aria-label={`${label} ${index+1}`} value={item} maxLength={2000} onChange={e=>onChange(items.map((old,i)=>i===index?e.target.value:old))}/><button type="button" className="admin-small" aria-label={`Remove ${label} ${index+1}`} onClick={()=>onChange(items.filter((_,i)=>i!==index))}>Remove</button></div>)}<button type="button" className="admin-small" disabled={items.length>=80} onClick={()=>onChange([...items,''])}>+ Add {label.toLowerCase()}</button></fieldset>
}

export function RepeatableStages({label,value,onChange}:{label:string;value:unknown;onChange:(value:Record<string,unknown>[])=>void}){
  const items=Array.isArray(value)?value.map(objectValue):[]
  const update=(index:number,key:string,value:string)=>onChange(items.map((old,i)=>i===index?{...old,[key]:value}:old))
  return <fieldset className="admin-repeat"><legend>{label}</legend>{items.map((item,index)=><div className="admin-stage" key={index}><label>Title {index+1}<input value={textValue(item.title)} maxLength={120} onChange={e=>update(index,'title',e.target.value)}/></label><label>Description {index+1}<textarea value={textValue(item.description)} maxLength={4000} rows={3} onChange={e=>update(index,'description',e.target.value)}/></label><button type="button" className="admin-small" onClick={()=>onChange(items.filter((_,i)=>i!==index))}>Remove item {index+1}</button></div>)}<button type="button" className="admin-small" disabled={items.length>=12} onClick={()=>onChange([...items,{title:'',description:''}])}>+ Add {label.toLowerCase()} item</button></fieldset>
}

export function FormField({field,value,onChange,catalog,disabled=false}:{field:AdminField;value:unknown;onChange:(value:unknown)=>void;catalog:AdminCatalog;disabled?:boolean}){
  if(field.type==='list')return <RepeatableStrings label={field.label} value={value} onChange={onChange}/>
  if(field.type==='roadmap')return <RepeatableStages label={field.label} value={value} onChange={onChange}/>
  if(field.type==='relations'){
    const selected=stringsValue(value)
    return <fieldset className="admin-repeat"><legend>{field.label}</legend><div className="admin-checklist">{(field.relation?catalog[field.relation]:[]).map(row=><label key={row.id}><input type="checkbox" checked={selected.includes(row.id)} onChange={event=>onChange(event.target.checked?[...selected,row.id]:selected.filter(id=>id!==row.id))}/>{recordTitle(row)} <small>{row.status}</small></label>)}</div>{field.hint&&<p className="field-hint">{field.hint}</p>}</fieldset>
  }
  const control=field.type==='textarea'?<textarea id={`admin-${field.key}`} value={textValue(value)} rows={4} maxLength={field.max??20000} onChange={e=>onChange(e.target.value)}/>:
    field.type==='select'?<select id={`admin-${field.key}`} value={textValue(value)} required={field.required} disabled={disabled} onChange={e=>onChange(e.target.value)}>{field.relation&&<option value="">Select {field.label.toLowerCase()}</option>}{field.relation?catalog[field.relation].map(row=><option key={row.id} value={row.id}>{relationLabel(row,catalog)}</option>):field.options?.map(option=><option key={option} value={option}>{option?option.replaceAll('_',' '):'No video'}</option>)}</select>:
    <input id={`admin-${field.key}`} type={field.type==='number'?'number':'text'} min={field.type==='number'?1:undefined} max={field.type==='number'?field.max:undefined} maxLength={field.type==='number'?undefined:field.max??300} required={field.required} value={typeof value==='number'?value:textValue(value)} onChange={e=>onChange(field.type==='number'?(e.target.value===''?null:Number(e.target.value)):e.target.value)}/>
  return <div className="admin-field"><label htmlFor={`admin-${field.key}`}>{field.label}{field.required&&<span aria-hidden="true"> *</span>}</label>{control}{field.hint&&<p className="field-hint">{field.hint}</p>}</div>
}

export function AcademicPlacement({resource,values,catalog,onChange}:{resource:AdminResource;values:Record<string,unknown>;catalog:AdminCatalog;onChange:(key:string,value:unknown)=>void}){
  const key=resource==='books'?'subject_id':resource==='experiments'?'lab_id':'semester_id'
  const selected=resource==='books'?catalog.subjects.find(row=>row.id===values.subject_id):resource==='experiments'?catalog.labs.find(row=>row.id===values.lab_id):undefined
  const existing=catalog.semesters.find(row=>row.id===(selected?.semester_id??values.semester_id))
  const [level,setLevel]=useState(textValue(existing?.academic_level)||'P1')
  const [branch,setBranch]=useState(textValue(existing?.branch_id))
  const [semester,setSemester]=useState(existing?.id??'')
  const semesters=catalog.semesters.filter(row=>row.academic_level===level&&(level==='P1'||row.branch_id===branch))
  const children=resource==='books'?catalog.subjects:catalog.labs
  const reset=()=>{setSemester('');onChange(key,'')}
  return <fieldset className="admin-placement"><legend>Academic placement</legend><div className="admin-form-grid"><label>Academic level<select value={level} onChange={e=>{setLevel(e.target.value);setBranch('');reset()}}><option>P1</option><option>E1</option></select></label>{level==='E1'&&<label>Branch<select value={branch} required onChange={e=>{setBranch(e.target.value);reset()}}><option value="">Select branch</option>{catalog.branches.map(row=><option key={row.id} value={row.id}>{relationLabel(row,catalog)}</option>)}</select></label>}<label>Semester<select value={semester} required onChange={e=>{setSemester(e.target.value);onChange(key,key==='semester_id'?e.target.value:'')}}><option value="">Select semester</option>{semesters.map(row=><option key={row.id} value={row.id}>{recordTitle(row)} ({row.status})</option>)}</select></label>{key!=='semester_id'&&<label>{resource==='books'?'Subject':'Lab'}<select required value={textValue(values[key])} onChange={e=>onChange(key,e.target.value)}><option value="">Select {resource==='books'?'subject':'lab'}</option>{children.filter(row=>row.semester_id===semester).map(row=><option key={row.id} value={row.id}>{recordTitle(row)} ({row.status})</option>)}</select></label>}</div><p className="field-hint">Create the parent in its section first. Parent content must be published before a child can be published.</p></fieldset>
}

export function SiteContentFields({page,value,onChange}:{page:string;value:unknown;onChange:(value:Record<string,unknown>)=>void}){
  const data=objectValue(value)
  const update=(key:string,value:unknown)=>onChange({...data,[key]:value})
  const fields=page==='about'?[['eyebrow','Eyebrow'],['intro','Introduction'],['why_title','Reasons heading'],['goal_title','Goal heading'],['goal','Goal']]:[['description','Introduction'],['academic_title','Academic heading'],['careers_title','Careers heading'],['tools_title','Student tools heading']]
  const cards=Array.isArray(data.cards)?data.cards.map(objectValue):[]
  const paths=['/resources/books','/resources/labs','/careers/domains','/careers/jobs']
  return <div className="admin-site-fields">{fields.map(([key,label])=><label key={key}>{label}<textarea rows={key==='intro'||key==='goal'||key==='description'?3:1} maxLength={key==='intro'||key==='goal'||key==='description'?20000:300} value={textValue(data[key])} onChange={e=>update(key,e.target.value)}/></label>)}{page==='about'?<RepeatableStages label="Reasons" value={data.why} onChange={items=>update('why',items)}/>:<fieldset className="admin-repeat"><legend>Explore cards</legend>{cards.map((card,index)=><div className="admin-stage" key={index}><label>Section<select value={textValue(card.path)} onChange={e=>update('cards',cards.map((old,i)=>i===index?{...old,path:e.target.value}:old))}>{paths.map(path=><option key={path} value={path}>{path.replace('/resources/','').replace('/careers/','Career ')}</option>)}</select></label><label>Card title<input value={textValue(card.title)} maxLength={300} onChange={e=>update('cards',cards.map((old,i)=>i===index?{...old,title:e.target.value}:old))}/></label><label>Card description<textarea value={textValue(card.description)} maxLength={1000} onChange={e=>update('cards',cards.map((old,i)=>i===index?{...old,description:e.target.value}:old))}/></label><button type="button" className="admin-small" onClick={()=>update('cards',cards.filter((_,i)=>i!==index))}>Remove card {index+1}</button></div>)}<button className="admin-small" type="button" disabled={cards.length>=4} onClick={()=>update('cards',[...cards,{path:paths.find(path=>!cards.some(c=>c.path===path))??paths[0],title:'',description:''}])}>+ Add card</button></fieldset>}</div>
}

export function prepareAdminBody(values:Record<string,unknown>):Record<string,unknown>{
  const result={...values}
  for(const key of ['id','created_at','updated_at'])delete result[key]
  for(const key of ['branch_id','resource_url','video_type','video_url','experiment_number','pdf_url','supporting_url','youtube_url','image_url','storage_type'])if(result[key]==='')result[key]=null
  if(result.academic_level==='P1')result.branch_id=null
  for(const [key,value] of Object.entries(result)){
    if(Array.isArray(value)&&value.every(item=>typeof item==='string'))result[key]=(value as string[]).map(item=>item.trim()).filter(Boolean)
  }
  if(typeof values.updated_at==='string')result.expected_updated_at=values.updated_at
  return result
}
