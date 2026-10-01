import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { ChevronRight, Search } from 'lucide-react'
import type { StudentProfile } from '../../types/student'
import { Logo } from '../Logo'
import { DesktopSidebar } from './DesktopSidebar'
import { MobileBottomNav } from './MobileBottomNav'
import { ProfileMenu } from './ProfileMenu'
import { SearchModal } from './SearchModal'
import { getStudentPageTitle } from '../../config/studentNavigation'

// Presentation-only shell. StudentShell supplies the verified profile and the
// existing logout control; navigation never creates or substitutes auth state.
export function AppShell({ profile, logoutAction, children }: { profile: StudentProfile; logoutAction: ReactNode; children: ReactNode }) {
  const { pathname } = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const reducedMotion = useReducedMotion()
  const mainRef = useRef<HTMLElement>(null)
  const previousPath = useRef(pathname)
  const closeSearch = useCallback(() => setSearchOpen(false), [])

  useEffect(() => {
    if (previousPath.current !== pathname) {
      setSearchOpen(false)
      mainRef.current?.focus({ preventScroll: true })
      previousPath.current = pathname
    }
  }, [pathname])

  return <div className="pivot-app-shell">
    <a className="skip-link" href="#student-content">Skip to content</a>
    <DesktopSidebar profile={profile} />
    <div className="pivot-app-body">
      <header className="pivot-app-header">
        <div className="pivot-mobile-brand"><Logo /></div>
        <p className="pivot-breadcrumb"><span>Student space</span><ChevronRight size={13} aria-hidden="true" /><strong>{getStudentPageTitle(pathname)}</strong></p>
        <div className="pivot-header-actions">
          <button type="button" className="pivot-search-trigger" aria-label="Search Pivot Sols" onClick={() => setSearchOpen(true)}><Search size={18} strokeWidth={1.7} aria-hidden="true" /><span>Search Pivot Sols</span></button>
          <ProfileMenu key={pathname} profile={profile} logoutAction={logoutAction} />
        </div>
      </header>
      <main id="student-content" className="pivot-main" ref={mainRef} tabIndex={-1}>
        <motion.div key={pathname} initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.28 }}>
          {children}
        </motion.div>
      </main>
      <footer className="pivot-app-footer"><span>Pivot Sols</span><span>Built around student needs.</span></footer>
    </div>
    <MobileBottomNav />
    <SearchModal open={searchOpen} onClose={closeSearch} level={profile.academicLevel} />
  </div>
}
