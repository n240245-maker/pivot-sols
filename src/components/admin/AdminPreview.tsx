import {Link} from 'react-router'
import type {AdminSection} from '../../config/adminFields'
import type {AdminCatalog,AdminRecord} from '../../types/admin'
import {textValue} from '../../types/admin'
import {objectValue,recordTitle} from './AdminForms'
import {LabVideo} from '../resources/labs/LabVideo'
import {safeResourceUrl} from '../../lib/referenceBooks'

export function studentPreviewPath(section:AdminSection,row:Record<string,unknown>,catalog:AdminCatalog):string|undefined{
  const slug=textValue(row.slug)
  if(section.resource==='branches')return `/branches/${slug}`
  if(section.resource==='career-domains')return `/careers/domains/${slug}`
  if(section.resource==='career-roles')return `/careers/jobs/${slug}`
  if(section.resource==='site-content')return row.key==='about'?'/about':'/explore'
  const subject=section.resource==='books'?catalog.subjects.find(item=>item.id===row.subject_id):section.resource==='subjects'?row:undefined
  const lab=section.resource==='experiments'?catalog.labs.find(item=>item.id===row.lab_id):section.resource==='labs'?row:undefined
  const semester=section.resource==='semesters'?row:catalog.semesters.find(item=>item.id===(subject?.semester_id??lab?.semester_id))
  if(!semester)return undefined
  const branch=catalog.branches.find(item=>item.id===semester.branch_id)
  const isLab=section.resource==='labs'||section.resource==='experiments'
  const level=textValue(semester.academic_level).toLowerCase()
  const prefix=branch?textValue(branch.slug):isLab?'':'common'
  return [`/resources/${isLab?'labs':'books'}`,level,prefix,`semester-${semester.number}`,textValue(subject?.slug??lab?.slug),section.resource==='experiments'?slug:''].filter(Boolean).join('/')
}

function PreviewValue({value}:{value:unknown}){
  if(Array.isArray(value))return <ul>{value.map((item,index)=><li key={index}>{typeof item==='string'?item:<PreviewValue value={item}/>}</li>)}</ul>
  if(value&&typeof value==='object')return <div>{Object.entries(objectValue(value)).map(([key,item])=><section key={key}><h4>{key.replaceAll('_',' ')}</h4><PreviewValue value={item}/></section>)}</div>
  return <p>{typeof value==='string'||typeof value==='number'?value:'Not added yet.'}</p>
}
export function AdminPreview({section,values,catalog}:{section:AdminSection;values:Record<string,unknown>;catalog:AdminCatalog}){
  const path=studentPreviewPath(section,values,catalog)
  const videoType=values.video_type==='youtube'||values.video_type==='mp4'||values.video_type==='external'?values.video_type:undefined
  const resourceUrl=safeResourceUrl(textValue(values.resource_url))
  return <article className="admin-preview"><div className="admin-preview-heading"><span className={`admin-status ${textValue(values.status)}`}>{textValue(values.status)||'draft'}</span><p>Private agent preview · only published content appears to students.</p></div><h2>{textValue(values.name)||textValue(values.title)||'Untitled'}</h2>{section.resource==='experiments'&&<LabVideo experiment={{id:textValue(values.id)||'preview',slug:textValue(values.slug),title:textValue(values.title),videoType,videoUrl:textValue(values.video_url),duration:textValue(values.duration)}}/>}<div className="admin-preview-body">{section.fields.filter(field=>!['name','title','slug','video_type','video_url','key'].includes(field.key)).map(field=>{const value=values[field.key];return <section key={field.key}><h3>{field.label}</h3>{field.relation?<p>{(Array.isArray(value)?value:[value]).map(id=>catalog[field.relation!].find(row=>row.id===id)).filter((row):row is AdminRecord=>!!row).map(recordTitle).join(', ')||'Not added yet.'}</p>:<PreviewValue value={value}/>}</section>})}{section.resource==='site-content'&&<PreviewValue value={values.content_json}/>}</div>{resourceUrl&&<a href={resourceUrl} target="_blank" rel="noopener noreferrer">Open book resource ↗</a>}{values.status==='published'&&path&&<Link className="button button-secondary" to={path} target="_blank">Open student page ↗</Link>}</article>
}
