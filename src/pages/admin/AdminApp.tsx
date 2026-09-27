import {Link,Route,Routes} from 'react-router'
import {AdminGuard,AdminProvider} from '../../contexts/AdminContext'
import {adminSections} from '../../config/adminFields'
import {AdminLoginPage} from './AdminLoginPage'
import {AdminDashboard,AdminShell} from './AdminShell'
import {AdminResourcePage} from './AdminResourcePage'
import {AdminProblemsPage} from './AdminProblemsPage'
import '../../admin.css'

export default function AdminApp(){return <AdminProvider><Routes><Route path="login" element={<AdminLoginPage/>}/><Route element={<AdminGuard/>}><Route element={<AdminShell/>}><Route index element={<AdminDashboard/>}/><Route path="problems" element={<AdminProblemsPage/>}/>{adminSections.flatMap(section=>['','/new','/:id','/:id/preview'].map(suffix=><Route key={section.path+suffix} path={section.path+suffix} element={<AdminResourcePage key={section.path} section={section}/>}/>))}<Route path="*" element={<div className="content-state"><h1>Agent page not found</h1><Link to="/admin">Back to agent overview</Link></div>}/></Route></Route></Routes></AdminProvider>}
