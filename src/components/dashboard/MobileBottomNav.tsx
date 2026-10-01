import { NavLink } from 'react-router'
import { studentNavigation } from '../../config/studentNavigation'

export function MobileBottomNav() {
  return <nav className="pivot-bottom-nav" aria-label="Mobile student navigation">
    {studentNavigation.map(({ mobileLabel, path, icon: Icon }) => <NavLink key={path} to={path} end={path !== '/branches'}><Icon size={20} strokeWidth={1.65} aria-hidden="true" /><span>{mobileLabel}</span></NavLink>)}
  </nav>
}
