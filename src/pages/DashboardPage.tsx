import { useAuth } from '../contexts/AuthContext'
import type { StudentProfile } from '../types/student'
import { LoadingScreen } from '../components/common/LoadingScreen'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { ResourceCard } from '../components/dashboard/ResourceCard'
import { StudentContext } from '../components/dashboard/StudentContext'
import { resourceDestinations } from '../config/studentNavigation'

export function DashboardPage() {
  const { profile } = useAuth()
  return profile ? <DashboardContent profile={profile} /> : <LoadingScreen />
}

export function DashboardContent({ profile }: { profile: StudentProfile }) {
  return <>
    <DashboardHeader profile={profile} />
    <section className="pivot-start-section" aria-labelledby="start-heading"><div className="pivot-section-heading"><div><h2 id="start-heading">Start here</h2><p>Resources selected for your Pivot Sols journey.</p></div><span className="pivot-section-note">Academics to possibilities</span></div><div className="pivot-resource-grid">{resourceDestinations.map((resource) => <ResourceCard key={resource.path} resource={resource} />)}</div></section>
    <StudentContext profile={profile} />
  </>
}
