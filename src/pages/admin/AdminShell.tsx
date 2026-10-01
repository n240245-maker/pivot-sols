import {createContext,useCallback,useContext,useEffect,useState} from 'react'
import {Link,NavLink,Outlet,useNavigate} from 'react-router'
import {adminApi} from '../../lib/adminApi'
import {useAdmin} from '../../contexts/AdminContext'
import {adminSections} from '../../config/adminFields'
import {emptyAdminCatalog} from '../../types/admin'
import type {AdminCatalog} from '../../types/admin'
import {Logo} from '../../components/Logo'

interface CatalogState {catalog:AdminCatalog;loading:boolean;error:string;reload:()=>Promise<void>}
const CatalogContext=createContext<CatalogState>({catalog:emptyAdminCatalog,loading:true,error:'',reload:async()=>undefined})
export const useAdminCatalog=()=>useContext(CatalogContext)
export function AdminShell(){
  const {admin,logout}=useAdmin()
  const navigate=useNavigate()
  const [catalog,setCatalog]=useState<AdminCatalog>(emptyAdminCatalog)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [logoutError,setLogoutError]=useState('')
  const [leaving,setLeaving]=useState(false)
  const reload=useCallback(async()=>{setLoading(true);setError('');try{setCatalog(await adminApi.catalog())}catch(reason){setError(reason instanceof Error?reason.message:'Unable to load content.')}finally{setLoading(false)}},[])
  useEffect(()=>{void reload()},[reload])
  async function signOut(){if(leaving)return;setLeaving(true);try{await logout();navigate('/admin/login',{replace:true})}catch(reason){setLogoutError(reason instanceof Error?reason.message:'Unable to log out.')}finally{setLeaving(false)}}
  return <CatalogContext.Provider value={{catalog,loading,error,reload}}><div className="admin-shell"><a className="skip-link" href="#admin-main">Skip to agent content</a><aside className="admin-sidebar"><Logo/><p className="admin-sidebar-label">Content management</p><nav aria-label="Agent navigation"><NavLink to="/admin" end>Overview</NavLink>{['Academics','Labs','Careers','Content'].map(group=><div key={group}><span>{group}</span>{adminSections.filter(section=>section.group===group).map(section=><NavLink key={section.path} to={`/admin/${section.path}`}>{section.title}</NavLink>)}</div>)}</nav><div className="admin-system"><a href="/" target="_blank" rel="noopener noreferrer">Preview Website ↗</a><button type="button" disabled={leaving} onClick={()=>void signOut()}>{leaving?'Logging out...':'Logout'}</button>{logoutError&&<p role="alert" className="field-error">{logoutError}</p>}</div></aside><div className="admin-workspace"><header className="admin-topbar"><strong>Agent Dashboard</strong><span>{admin?.email}</span></header><main id="admin-main" tabIndex={-1}>{loading?<div className="content-state" role="status">Loading content...</div>:error?<div className="content-state" role="alert"><p>{error}</p><button className="button button-secondary" onClick={()=>void reload()}>Try Again</button></div>:<Outlet/>}</main></div></div></CatalogContext.Provider>
}

export function AdminDashboard(){
  const {catalog}=useAdminCatalog()
  const all=Object.values(catalog).flat()
  return <div><p className="pivot-eyebrow">Your publishing workspace</p><h1>Agent Dashboard</h1><p className="admin-lead">Keep academic resources and career guides useful, current and ready for students.</p><div className="admin-stats">{(['published','draft','archived'] as const).map(status=><div key={status}><span className={`admin-status ${status}`}>{status}</span><strong>{all.filter(row=>row.status===status).length}</strong><span>content records</span></div>)}</div><div className="admin-section-grid">{adminSections.map(section=><Link key={section.path} to={`/admin/${section.path}`}><span>{section.group}</span><h2>{section.title}</h2><p>{catalog[section.resource].length} records · {catalog[section.resource].filter(row=>row.status==='draft').length} drafts</p><strong>Manage →</strong></Link>)}</div></div>
}
