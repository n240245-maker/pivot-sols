import { NavLink } from 'react-router'
import { ChevronRight, GraduationCap } from 'lucide-react'
import { Logo } from '../Logo'
import { InitialsAvatar } from './InitialsAvatar'
import { navigationForLevel } from '../../config/studentNavigation'
import type { StudentProfile } from '../../types/student'

export function DesktopSidebar({ profile }: { profile: StudentProfile }) {
  return <aside className="pivot-sidebar">
    <div className="pivot-sidebar-brand"><Logo /></div>
    <div className="pivot-sidebar-nav-wrap">
      <p className="pivot-nav-caption">Your campus companion</p>
      <nav aria-label="Main student navigation" className="pivot-sidebar-nav">
        {navigationForLevel(profile.academicLevel).filter(item=>item.path!=='/profile').map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} end={path !== '/branches'}><Icon size={19} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span></NavLink>)}
      </nav>
    </div>
    <div className="pivot-sidebar-bottom">
      <div className="pivot-campus"><GraduationCap size={20} strokeWidth={1.5} aria-hidden="true" /><div><strong>Built for your campus</strong><span>RGUKT {profile.campus}</span></div></div>
      <NavLink to="/profile" className="pivot-sidebar-profile" aria-label="Profile" end>
        <InitialsAvatar name={profile.name} />
        <span><strong>{profile.name}</strong><small>{profile.academicLevel} · {profile.studentId}</small></span>
        <ChevronRight size={15} aria-hidden="true" />
      </NavLink>
    </div>
  </aside>
}
