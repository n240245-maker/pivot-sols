import { useAuth } from '../contexts/AuthContext'
import { LogoutButton } from '../components/common/StudentShell'
import { LoadingScreen } from '../components/common/LoadingScreen'
import { InitialsAvatar } from '../components/dashboard/InitialsAvatar'
import type { StudentProfile } from '../types/student'
import type { ReactNode } from 'react'
import { ArrowLeft, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router'

export function ProfilePage() {
  const { profile } = useAuth()
  return profile ? <ProfileContent profile={profile} logoutAction={<LogoutButton />} /> : <LoadingScreen />
}

export function ProfileContent({ profile, logoutAction }: { profile: StudentProfile; logoutAction: ReactNode }) {
  const fields = [
    ['Name', profile.name],
    ['RGUKT ID', profile.studentId],
    ['Academic Level', profile.academicLevel],
    ['Campus', `RGUKT ${profile.campus}`],
    ...(profile.email ? [['Email', profile.email]] : []),
  ]
  return <section className="pivot-profile-page">
    <Link to="/dashboard" className="pivot-back-link"><ArrowLeft size={16} aria-hidden="true" />Back to dashboard</Link>
    <p className="pivot-eyebrow">Your student identity</p><h1>Profile</h1><p className="pivot-page-description">Your place in the Pivot Sols community.</p>
    <div className="pivot-profile-card"><div className="pivot-profile-overview"><InitialsAvatar name={profile.name} large /><div><h2>{profile.name}</h2><p>{profile.studentId} <span aria-hidden="true">·</span> {profile.academicLevel}</p></div></div>
      <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className="pivot-readonly-note"><LockKeyhole size={15} aria-hidden="true" />Your student identity details are read-only.</p>
      <div className="pivot-profile-logout">{logoutAction}</div>
    </div>
  </section>
}
