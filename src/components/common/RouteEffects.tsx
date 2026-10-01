import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { resourceDestinations } from '../../config/studentNavigation'
import { useContent } from '../../contexts/ContentContext'
import { resolveBooksRoute } from '../../lib/referenceBooks'
import { getLabPageTitle, LABS_ROOT } from '../../lib/labVideos'
import { discoveryTitle } from '../../lib/discoveryTitles'

const titles: Record<string, string> = {
  '/': 'Pivot Sols — Built for RGUKT Nuzvid',
  '/signup': 'Create your account — Pivot Sols',
  '/login': 'Log in — Pivot Sols',
  '/auth/callback': 'Signing you in — Pivot Sols',
  '/complete-profile': 'Complete your profile — Pivot Sols',
  '/dashboard': 'Dashboard · Pivot Sols',
  '/profile': 'Profile · Pivot Sols',
  '/branches': 'Branches · Pivot Sols',
  '/about': 'About · Pivot Sols',
  '/contact': 'Contact · Pivot Sols',
  ...Object.fromEntries(resourceDestinations.map(({ path, title }) => [path, `${title} · Pivot Sols`])),
}

export function RouteEffects() {
  const { pathname } = useLocation()
  const {data,status}=useContent()
  useEffect(() => {
    const referenceBooksCatalog=data.books
    const labVideosCatalog=data.labs
    if(pathname.startsWith('/admin')) { document.title=pathname==='/admin/login'?'Agent Login | Pivot Sols':'Agent Dashboard | Pivot Sols'; return }
    if(status!=='ready' && /^\/(resources|careers|branches)\//.test(pathname)) {document.title='Loading resources · Pivot Sols';return}
    if (pathname.startsWith('/resources/books/')) {
      const p1 = resolveBooksRoute(referenceBooksCatalog, 'P1', pathname)
      const e1 = resolveBooksRoute(referenceBooksCatalog, 'E1', pathname)
      const resource = p1.valid ? p1 : e1
      document.title = `${resource.valid ? resource.subject?.name ?? 'Reference Books' : 'Resource not found'} · Pivot Sols`
    } else if (pathname === LABS_ROOT || pathname.startsWith(`${LABS_ROOT}/`)) document.title = getLabPageTitle(labVideosCatalog, pathname)
    else document.title = discoveryTitle(pathname,data) ?? titles[pathname.replace(/\/$/, '') || '/'] ?? 'Page not found — Pivot Sols'
  }, [pathname,data,status])
  useEffect(()=>{window.scrollTo({ top: 0, left: 0, behavior: 'instant' })},[pathname])
  return null
}
