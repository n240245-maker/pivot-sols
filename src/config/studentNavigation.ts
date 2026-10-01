import { BookOpen, BriefcaseBusiness, Compass, FlaskConical, House, Info, MessageCircle, Network, Sparkles, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface ResourceDestination {
  title: string
  description: string
  category: string
  path: string
  icon: LucideIcon
  accent: 'indigo' | 'purple' | 'blend' | 'amber' | 'explore'
}

export const studentNavigation = [
  { label: 'Home', mobileLabel: 'Home', path: '/dashboard', icon: House },
  { label: 'All Branches', mobileLabel: 'Branches', path: '/branches', icon: Network },
  { label: 'About', mobileLabel: 'About', path: '/about', icon: Info },
  { label: 'Contact', mobileLabel: 'Contact', path: '/contact', icon: MessageCircle },
  { label: 'Profile', mobileLabel: 'Profile', path: '/profile', icon: UserRound },
] as const

export const resourceDestinations: readonly ResourceDestination[] = [
  { title: 'Reference Books', description: 'Find subject-wise books and study references for your coursework.', category: 'Academic', path: '/resources/books', icon: BookOpen, accent: 'indigo' },
  { title: 'Lab Videos', description: 'Watch practical demonstrations and understand experiments before entering the lab.', category: 'Practical', path: '/resources/labs', icon: FlaskConical, accent: 'purple' },
  { title: 'Career Domains', description: 'Explore technical fields and understand what each career path actually involves.', category: 'Explore careers', path: '/careers/domains', icon: Compass, accent: 'blend' },
  { title: 'Career Jobs', description: 'Discover roles, required skills and possible career paths after graduation.', category: 'Career', path: '/careers/jobs', icon: BriefcaseBusiness, accent: 'amber' },
  { title: 'Explore', description: 'Discover resources, search across Pivot Sols and find your next step.', category: 'More possibilities', path: '/explore', icon: Sparkles, accent: 'explore' },
]

export function getStudentPageTitle(pathname: string): string {
  if (pathname.startsWith('/resources/books/')) return 'Reference Books'
  if (pathname.startsWith('/resources/labs/')) return 'Lab Videos'
  if (pathname.startsWith('/careers/domains/')) return 'Career Domains'
  if (pathname.startsWith('/careers/jobs/')) return 'Career Jobs'
  if (pathname.startsWith('/branches/')) return 'All Branches'
  return resourceDestinations.find((item) => item.path === pathname)?.title ??
    studentNavigation.find((item) => item.path === pathname)?.label ?? 'Student space'
}
