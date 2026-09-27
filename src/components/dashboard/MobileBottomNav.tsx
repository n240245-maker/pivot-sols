import { NavLink } from 'react-router'
import { navigationForLevel } from '../../config/studentNavigation'
import type { SupportedAcademicLevel } from '../../types/student'

export function MobileBottomNav({level}:{level:SupportedAcademicLevel}) {
  return <nav className="pivot-bottom-nav" aria-label="Mobile student navigation">
    {navigationForLevel(level).map(({ mobileLabel, path, icon: Icon }) => <NavLink key={path} to={path} end={path !== '/branches'}><Icon size={20} strokeWidth={1.65} aria-hidden="true" /><span>{mobileLabel}</span></NavLink>)}
  </nav>
}
