import {useRef,useState} from 'react'
import type {FormEvent} from 'react'
import {Link,Navigate,useNavigate} from 'react-router'
import {useAdmin} from '../../contexts/AdminContext'
import {adminApi} from '../../lib/adminApi'
import {Logo} from '../../components/Logo'

export function AdminLoginPage(){
  const {admin,loading,accept}=useAdmin()
  const navigate=useNavigate()
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const pending=useRef(false)
  async function submit(event:FormEvent){
    event.preventDefault();if(pending.current)return
    pending.current=true;setBusy(true);setError('')
    try{const value=await adminApi.login(email,password);accept(value.admin);navigate('/admin',{replace:true})}
    catch(reason){setError(reason instanceof Error?reason.message:'Sign-in failed. Please try again.')}
    finally{pending.current=false;setBusy(false)}
  }
  if(loading)return <div className="content-state">Checking agent session...</div>
  if(admin)return <Navigate to="/admin" replace/>
  return <div className="admin-login"><header><Logo/><Link to="/">Back to website</Link></header><main><p className="pivot-eyebrow">Authorized agents</p><h1>Agent Login</h1><p className="admin-lead">Sign in to manage and publish student resources.</p><form onSubmit={submit} className="admin-login-form"><fieldset disabled={busy}><label>Agent Email<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={event=>setPassword(event.target.value)}/></label>{error&&<p className="field-error" role="alert">{error}</p>}<button className="button button-primary" type="submit">{busy?'Signing in...':'Login'}</button></fieldset></form><p className="field-hint">Agent access is separate from student sign-in.</p></main></div>
}
