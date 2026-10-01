import {createContext,useCallback,useContext,useEffect,useState} from 'react'
import type {ReactNode} from 'react'
import {Navigate,Outlet} from 'react-router'
import {adminApi,AdminApiError} from '../lib/adminApi'
import type {AdminIdentity} from '../types/admin'

interface AdminState {admin:AdminIdentity|null;loading:boolean;error:string;refresh:()=>Promise<void>;accept:(admin:AdminIdentity)=>void;logout:()=>Promise<void>}
const AdminContext=createContext<AdminState|null>(null)
export function AdminProvider({children}:{children:ReactNode}){
  const [admin,setAdmin]=useState<AdminIdentity|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const refresh=useCallback(async()=>{
    setLoading(true);setError('')
    try{setAdmin((await adminApi.me()).admin)}catch(reason){setAdmin(null);if(!(reason instanceof AdminApiError)||![401,403].includes(reason.status))setError(reason instanceof Error?reason.message:'Unable to load agent session.')}
    finally{setLoading(false)}
  },[])
  useEffect(()=>{void refresh();const expired=()=>setAdmin(null);window.addEventListener('pivot-admin-expired',expired);return()=>window.removeEventListener('pivot-admin-expired',expired)},[refresh])
  const logout=async()=>{await adminApi.logout();setAdmin(null)}
  return <AdminContext.Provider value={{admin,loading,error,refresh,accept:setAdmin,logout}}>{children}</AdminContext.Provider>
}
export function useAdmin(){const value=useContext(AdminContext);if(!value)throw new Error('AdminProvider is required.');return value}
export function AdminGuard(){
  const {admin,loading,error,refresh}=useAdmin()
  if(loading)return <div className="content-state" role="status">Checking agent session...</div>
  if(error)return <div className="content-state" role="alert"><p>{error}</p><button className="button button-secondary" onClick={()=>void refresh()}>Try Again</button></div>
  return admin?<Outlet/>:<Navigate to="/admin/login" replace/>
}
