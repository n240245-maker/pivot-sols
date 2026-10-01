import type { CareerCategory, CareerDomain, CareerRole } from '../types/careers'

export const domainPath = (slug: string) => `/careers/domains/${slug}`
export const rolePath = (slug: string) => `/careers/jobs/${slug}`
export const findDomain = (slug: string | undefined, careerDomains: readonly CareerDomain[] = []) => careerDomains.find(item => item.slug === slug)
export const findRole = (slug: string | undefined, careerRoles: readonly CareerRole[] = []) => careerRoles.find(item => item.slug === slug)
export function filterDomains(query: string, category: CareerCategory | 'All' = 'All', careerDomains: readonly CareerDomain[] = [], careerRoles: readonly CareerRole[] = []) {
  const term = query.trim().toLocaleLowerCase()
  return careerDomains.filter(domain => (category === 'All' || domain.category === category) && [domain.name,domain.category,...domain.skills,...domain.tools,...domain.roleIds.flatMap(id=>careerRoles.find(role=>role.id===id)?.name ?? [])].join(' ').toLocaleLowerCase().includes(term))
}
export function filterRoles(query: string, category: CareerCategory | 'All' = 'All', careerDomains: readonly CareerDomain[] = [], careerRoles: readonly CareerRole[] = []) {
  const term = query.trim().toLocaleLowerCase()
  return careerRoles.filter(role => {
    const domain = findDomain(role.domainSlug, careerDomains)
    return (category === 'All' || domain?.category === category) && [role.name,domain?.name,domain?.category,...role.skills,...role.tools,...role.technologies].join(' ').toLocaleLowerCase().includes(term)
  })
}
