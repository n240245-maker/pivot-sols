import type { Curriculum, Semester } from '../types/referenceBooks'
import type { Lab, LabCatalog, LabExperiment } from '../types/labVideos'
import type { SupportedAcademicLevel } from '../types/student'
import type { ResourceCrumb } from './referenceBooks'

export const LABS_ROOT = '/resources/labs'
export interface LabsRoute { valid: boolean; curriculum?: Curriculum; semester?: Semester; lab?: Lab; experiment?: LabExperiment }
export const getLabs = (data: LabCatalog, curriculumId: string, semesterId: string) => data.labs.filter(lab => lab.curriculumId === curriculumId && lab.semesterId === semesterId)

export function labsPath(curriculum: Curriculum, semester?: Semester, lab?: Lab, experiment?: LabExperiment): string {
  return [LABS_ROOT, curriculum.level.toLowerCase(), curriculum.branch ? curriculum.id : undefined, semester?.id, lab?.slug, experiment?.slug].filter(Boolean).join('/')
}

export function resolveLabsRoute(data: LabCatalog, level: SupportedAcademicLevel, pathname: string): LabsRoute {
  const path = pathname.replace(/\/$/, '')
  if (path === LABS_ROOT) return { valid: true }
  if (!path.startsWith(`${LABS_ROOT}/`)) return { valid: false }
  const parts = path.slice(LABS_ROOT.length + 1).split('/')
  if (parts.some(p => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p)) || parts[0] !== level.toLowerCase()) return { valid: false }
  const branched = level === 'E1'
  const index = branched ? 2 : 1
  if (parts.length < index || parts.length > index + 3) return { valid: false }
  const curriculum = data.curricula.find(c => c.level === level && (branched ? !!c.branch && c.id === parts[1] : !c.branch))
  if (!curriculum) return { valid: false }
  const semester = parts[index] ? curriculum.semesters.find(s => s.id === parts[index]) : undefined
  if (parts[index] && !semester) return { valid: false }
  const lab = semester && parts[index + 1] ? getLabs(data, curriculum.id, semester.id).find(l => l.slug === parts[index + 1]) : undefined
  if (parts[index + 1] && !lab) return { valid: false }
  const experiment = lab && parts[index + 2] ? lab.experiments.find(e => e.slug === parts[index + 2]) : undefined
  if (parts[index + 2] && !experiment) return { valid: false }
  return { valid: true, curriculum, semester, lab, experiment }
}

export function getLabsBreadcrumbs(route: LabsRoute): ResourceCrumb[] {
  const crumbs: ResourceCrumb[] = [{ label: 'Lab Videos', to: LABS_ROOT }]
  const { curriculum, semester, lab, experiment } = route
  if (curriculum?.branch) crumbs.push({ label: curriculum.branch.shortName ?? curriculum.branch.name, to: labsPath(curriculum) })
  if (curriculum && semester) crumbs.push({ label: semester.name, to: labsPath(curriculum, semester) })
  if (curriculum && semester && lab) crumbs.push({ label: lab.name, to: labsPath(curriculum, semester, lab) })
  if (experiment) crumbs.push({ label: experiment.title })
  return crumbs.map((crumb, index) => index === crumbs.length - 1 ? { label: crumb.label } : crumb)
}

export function searchLabResources(data: LabCatalog, level: SupportedAcademicLevel, query: string, scope: LabsRoute = { valid: true }) {
  const term = query.trim().toLocaleLowerCase()
  if (!term || !scope.valid) return []
  return data.labs.flatMap(lab => {
    const curriculum = data.curricula.find(c => c.level === level && c.id === lab.curriculumId)
    const semester = curriculum?.semesters.find(s => s.id === lab.semesterId)
    if (!curriculum || !semester || (scope.curriculum && lab.curriculumId !== scope.curriculum.id) || (scope.semester && semester.id !== scope.semester.id) || (scope.lab && lab.id !== scope.lab.id)) return []
    const labMatches = lab.name.toLocaleLowerCase().includes(term)
    const experiments = lab.experiments.filter(e => labMatches || e.title.toLocaleLowerCase().includes(term))
    return labMatches || experiments.length ? [{ curriculum, semester, lab, experiments }] : []
  })
}

export function getLabPageTitle(data: LabCatalog, pathname: string): string {
  const p1 = resolveLabsRoute(data, 'P1', pathname)
  const route = p1.valid ? p1 : resolveLabsRoute(data, 'E1', pathname)
  return `${route.valid ? route.experiment?.title ?? route.lab?.name ?? 'Lab Videos' : 'Lab resource not found'} · Pivot Sols`
}
