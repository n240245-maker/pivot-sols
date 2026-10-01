import {useRef,useState} from 'react'
import type {FormEvent} from 'react'
import {Link,Navigate,useNavigate} from 'react-router'
import {useAdmin} from '../../contexts/AdminContext'
import {adminApi} from '../../lib/adminApi'
import type {AdminChallenge} from '../../types/admin'
import {useOtpCountdown} from '../../hooks/useOtpCountdown'
import {Logo} from '../../components/Logo'

export function AdminLoginPage(){
  const {admin,loading,accept}=useAdmin()
  const navigate=useNavigate()
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [otp,setOtp]=useState('')
  const [challenge,setChallenge]=useState<AdminChallenge|null>(null)
  const [deadline,setDeadline]=useState(0)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const pending=useRef(false)
  const seconds=useOtpCountdown(deadline)
  const setCode=(value:AdminChallenge)=>{setChallenge(value);setDeadline(Date.now()+value.resend_after*1000);setOtp('');setPassword('')}
  async function submit(event:FormEvent){
    event.preventDefault();if(pending.current)return
    pending.current=true;setBusy(true);setError('')
    try{
      if(challenge){const value=await adminApi.verify(challenge.challenge,otp);accept(value.admin);navigate('/admin',{replace:true})}
      else setCode(await adminApi.login(email,password))
    }catch(reason){setError(reason instanceof Error?reason.message:'Sign-in failed. Please try again.')}
    finally{pending.current=false;setBusy(false)}
  }
  async function resend(){if(!challenge||pending.current||seconds)return;pending.current=true;setBusy(true);setError('');try{setCode(await adminApi.resend(challenge.challenge))}catch(reason){setError(reason instanceof Error?reason.message:'Unable to send code.')}finally{pending.current=false;setBusy(false)}}
  if(loading)return <div className="content-state">Checking agent session...</div>
  if(admin)return <Navigate to="/admin" replace/>
  return <div className="admin-login"><header><Logo/><Link to="/">Back to website</Link></header><main><p className="pivot-eyebrow">Authorized agents</p><h1>Agent Login</h1><p className="admin-lead">{challenge?'Enter the six-digit code sent to your agent email.':'Sign in to manage and publish student resources.'}</p><form onSubmit={submit} className="admin-login-form"><fieldset disabled={busy}>{challenge?<label>Verification code<input autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))}/><span className="field-hint">Code expires after 5 minutes.</span></label>:<><label>Agent email<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label></>}{error&&<p className="field-error" role="alert">{error}</p>}<button className="button button-primary" type="submit">{busy?(challenge?'Verifying...':'Sending agent code...'):challenge?'Verify and sign in':'Continue with password'}</button></fieldset></form>{challenge&&<div className="admin-login-actions"><button type="button" disabled={busy||seconds>0} onClick={()=>void resend()}>{seconds?`Resend in ${seconds}s`:'Resend code'}</button><button type="button" disabled={busy} onClick={()=>{setChallenge(null);setOtp('');setError('')}}>Start again</button></div>}<p className="field-hint">Agent access is separate from student sign-in.</p></main></div>
}
