import { Navigate, Route, Routes } from 'react-router'
import {lazy,Suspense} from 'react'
import { LandingPage } from './pages/LandingPage'
import { SignupPage } from './pages/SignupPage'
import { LoginPage } from './pages/LoginPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { CompleteProfilePage } from './pages/CompleteProfilePage'
import { DashboardPage } from './pages/DashboardPage'
import { ProfilePage } from './pages/ProfilePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { GuestRoute, ProtectedRoute } from './components/ProtectedRoute'
import { RouteEffects } from './components/common/RouteEffects'
import { StudentShell } from './components/common/StudentShell'
import { BranchesPage } from './pages/BranchesPage'
import { AboutPage } from './pages/AboutPage'
import { ContactPage } from './pages/ContactPage'
import { CareerDomainsPage } from './pages/CareerDomainsPage'
import { CareerJobsPage } from './pages/CareerJobsPage'
import { ExplorePage } from './pages/ExplorePage'
import { DiscoveryNotFound } from './components/resources/Discovery'
import { ReferenceBooksPage } from './pages/ReferenceBooksPage'
import { LabVideosPage } from './pages/LabVideosPage'
import { DemoLoginPage } from './pages/DemoLoginPage'
import { DEMO_MODE } from './config/demo'
const AdminApp=lazy(()=>import('./pages/admin/AdminApp'))

export default function App() {
  return (
    <><RouteEffects /><Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/admin/*" element={<Suspense fallback={<div className="content-state">Loading admin...</div>}><AdminApp/></Suspense>} />
      <Route element={<GuestRoute />}>
        <Route path="/signup" element={DEMO_MODE ? <Navigate to="/login" replace /> : <SignupPage />} />
        <Route path="/login" element={DEMO_MODE ? <DemoLoginPage /> : <LoginPage />} />
      </Route>
      <Route path="/auth/callback" element={DEMO_MODE ? <Navigate to="/dashboard" replace /> : <AuthCallbackPage />} />
      <Route path="/complete-profile" element={DEMO_MODE ? <Navigate to="/dashboard" replace /> : <CompleteProfilePage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<StudentShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/branches" element={<BranchesPage />} />
          <Route path="/branches/:branchSlug" element={<BranchesPage />} />
          <Route path="/branches/*" element={<DiscoveryNotFound kind="Branch" to="/branches" />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/resources/books" element={<ReferenceBooksPage />} />
          <Route path="/resources/books/*" element={<ReferenceBooksPage />} />
          <Route path="/resources/labs" element={<LabVideosPage />} />
          <Route path="/resources/labs/*" element={<LabVideosPage />} />
          <Route path="/careers/domains" element={<CareerDomainsPage />} />
          <Route path="/careers/domains/:domainSlug" element={<CareerDomainsPage />} />
          <Route path="/careers/domains/*" element={<DiscoveryNotFound kind="Career domain" to="/careers/domains" />} />
          <Route path="/careers/jobs" element={<CareerJobsPage />} />
          <Route path="/careers/jobs/:roleSlug" element={<CareerJobsPage />} />
          <Route path="/careers/jobs/*" element={<DiscoveryNotFound kind="Career role" to="/careers/jobs" />} />
          <Route path="/explore" element={<ExplorePage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes></>
  )
}
