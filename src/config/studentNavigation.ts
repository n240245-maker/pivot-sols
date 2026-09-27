import { BookOpen, BriefcaseBusiness, Compass, FlaskConical, House, Info, MessageCircle, Network, Search, Sparkles, UserRound, Users, Building2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SupportedAcademicLevel } from '../types/student'

export interface ResourceDestination {
  title: string
  description: string
  category: string
  path: string
  icon: LucideIcon
  accent: 'indigo' | 'purple' | 'blend' | 'amber' | 'explore'
}
const commonResources: readonly ResourceDestination[] = [
  { title: 'Reference Books', description: 'Find subject-wise books and study references for your coursework.', category: 'Academic', path: '/resources/books', icon: BookOpen, accent: 'indigo' },
  { title: 'Lab Videos', description: 'Watch practical demonstrations and understand experiments before entering the lab.', category: 'Practical', path: '/resources/labs', icon: FlaskConical, accent: 'purple' },
]
const p1Resources: readonly ResourceDestination[] = [
  { title: 'I3 Block Rooms', description: 'Find important offices, room numbers and contact details.', category: 'Campus', path: '/campus/rooms', icon: Building2, accent: 'blend' },
  { title: 'Faculty Directory', description: 'Find faculty by subject and get in touch.', category: 'Faculty', path: '/faculty', icon: Users, accent: 'amber' },
]
const e1Resources: readonly ResourceDestination[] = [
  { title: 'Career Domains', description: 'Browse branch-wise career domain resources and PDFs.', category: 'Explore careers', path: '/careers/domains', icon: Compass, accent: 'blend' },
  { title: 'Career Jobs', description: 'Browse branch-wise job resources and PDFs.', category: 'Career', path: '/careers/jobs', icon: BriefcaseBusiness, accent: 'amber' },
]
const sharedEnd: readonly ResourceDestination[] = [
  { title: 'Student Problems', description: 'Report a campus problem and support community reports.', category: 'Community', path: '/problems', icon: MessageCircle, accent: 'purple' },
  { title: 'Explore', description: 'Discover resources, search across Pivot Sols and find your next step.', category: 'More possibilities', path: '/explore', icon: Sparkles, accent: 'explore' },
]
export function resourcesForLevel(level: SupportedAcademicLevel): readonly ResourceDestination[] {
  return [...commonResources, ...(level === 'P1' ? p1Resources : e1Resources), ...sharedEnd]
}
// A complete registry for titles and metadata; render resourcesForLevel for students.
export const resourceDestinations = [...commonResources, ...p1Resources, ...e1Resources, ...sharedEnd] as const
const nav = (label: string, path: string, icon: LucideIcon, mobileLabel = label) => ({ label, mobileLabel, path, icon })
export function navigationForLevel(level: SupportedAcademicLevel) {
  return [
    nav('Dashboard', '/dashboard', House, 'Home'),
    nav('Reference Books', '/resources/books', BookOpen, 'Books'),
    nav('Lab Videos', '/resources/labs', FlaskConical, 'Labs'),
    ...(level === 'P1' ? [nav('I3 Block Rooms', '/campus/rooms', Building2, 'Rooms'), nav('Faculty Directory', '/faculty', Users, 'Faculty')]
      : [nav('Career Domains', '/careers/domains', Compass, 'Domains'), nav('Career Jobs', '/careers/jobs', BriefcaseBusiness, 'Jobs')]),
    nav('Student Problems', '/problems', MessageCircle, 'Problems'),
    nav('Explore', '/explore', Search),
    ...(level === 'E1' ? [nav('Branches', '/branches', Network)] : []),
    nav('About', '/about', Info), nav('Contact', '/contact', MessageCircle), nav('Profile', '/profile', UserRound),
  ]
}
export const studentNavigation = navigationForLevel('E1')
export function getStudentPageTitle(pathname: string): string {
  if (pathname.startsWith('/resources/books/')) return 'Reference Books'
  if (pathname.startsWith('/resources/labs/')) return 'Lab Videos'
  if (pathname.startsWith('/careers/domains/')) return 'Career Domains'
  if (pathname.startsWith('/careers/jobs/')) return 'Career Jobs'
  if (pathname.startsWith('/branches/')) return 'Branches'
  return resourceDestinations.find((item) => item.path === pathname)?.title ??
    studentNavigation.find((item) => item.path === pathname)?.label ?? 'Student space'
}
