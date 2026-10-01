import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { ArrowLeft, CalendarDays, FlaskConical, Network, Search, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { LoadingScreen } from '../components/common/LoadingScreen'
import { ResourceBreadcrumbs } from '../components/resources/books/ResourceBreadcrumbs'
import { ResourceEmptyState } from '../components/resources/books/ResourceEmptyState'
import { SelectionCard } from '../components/resources/books/SelectionCard'
import { ExperimentGuide } from '../components/resources/labs/ExperimentGuide'
import { ExperimentList, LabGrid } from '../components/resources/labs/LabLists'
import { useContent } from '../contexts/ContentContext'
import { getSelectedBranch, setSelectedBranch } from '../lib/branchPreference'
import { getLabs, getLabsBreadcrumbs, LABS_ROOT, labsPath, resolveLabsRoute, searchLabResources } from '../lib/labVideos'
import type { LabsRoute } from '../lib/labVideos'
import type { LabCatalog } from '../types/labVideos'
import type { StudentProfile, SupportedAcademicLevel } from '../types/student'

export function LabVideosPage() {
  const { profile } = useAuth()
  const {data}=useContent()
  return profile ? <LabsContent profile={profile} data={data.labs} /> : <LoadingScreen />
}

export function LabsContent({ profile, data }: { profile: StudentProfile; data: LabCatalog }) {
  const { pathname, search: locationSearch } = useLocation()
  const viewKey = pathname + locationSearch
  const [search, setSearch] = useState({ path: viewKey, query: '' })
  const query = search.path === viewKey ? search.query : ''
  const [selected, setSelected] = useState(() => getSelectedBranch(data))
  const route = resolveLabsRoute(data, profile.academicLevel, pathname)
  const { curriculum, semester, lab, experiment } = route
  const curricula = data.curricula.filter(c => c.level === profile.academicLevel)
  const choosingBranch = !curriculum && profile.academicLevel === 'E1' && new URLSearchParams(locationSearch).get('choose') === 'branch'
  const preferred = !choosingBranch && profile.academicLevel === 'E1' ? curricula.find(c => c.id === selected && c.branch) : undefined
  const activeCurriculum = curriculum ?? (profile.academicLevel === 'P1' ? curricula.find(c => !c.branch) : preferred)
  const view = { ...route, curriculum: activeCurriculum }

  useEffect(() => {
    if (route.valid && profile.academicLevel === 'E1' && curriculum?.branch) {
      setSelectedBranch(data, curriculum.id)
      setSelected(curriculum.id)
    }
  }, [data, curriculum, profile.academicLevel, route.valid])

  if (!route.valid) return <div className="books-page labs-page"><ResourceEmptyState icon={FlaskConical} title="Lab resource not found" description="This lab resource isn't available for your academic level." /><Link className="pivot-back-link" to={LABS_ROOT}><ArrowLeft size={16} aria-hidden="true" />Back to Lab Videos</Link></div>

  const back = experiment && curriculum && semester && lab ? { to: labsPath(curriculum, semester, lab), label: 'Back to Experiments' }
    : lab && curriculum && semester ? { to: labsPath(curriculum, semester), label: 'Back to Labs' }
    : semester && curriculum ? { to: labsPath(curriculum), label: 'Back to Semesters' }
    : curriculum?.branch ? { to: `${LABS_ROOT}?choose=branch`, label: 'Back to Branches' }
    : { to: '/dashboard', label: 'Back to dashboard' }
  const labs = curriculum && semester ? getLabs(data, curriculum.id, semester.id) : []
  const branchEmpty = curriculum?.branch && !data.labs.some(item => item.curriculumId === curriculum.id)
  return <div className="books-page labs-page">
    <ResourceBreadcrumbs items={getLabsBreadcrumbs(view)} />
    <Link className="pivot-back-link" to={back.to}><ArrowLeft size={16} aria-hidden="true" />{back.label}</Link>
    <header className="books-heading">
      <p className="pivot-eyebrow"><FlaskConical size={15} aria-hidden="true" /> Learn through practice</p>
      <h1>{experiment?.title ?? lab?.name ?? 'Lab Videos'}</h1>
      <p className="books-intro">{experiment ? lab?.name : lab ? 'Explore the experiments and prepare for your next practical.' : 'Understand experiments before entering the lab.'}</p>
      <div className="books-context"><span>Academic Level</span><span className="pivot-level-badge" aria-label={`Academic level ${profile.academicLevel}`}>{profile.academicLevel}</span>{activeCurriculum?.branch && <span>{activeCurriculum.branch.shortName ?? activeCurriculum.branch.name}</span>}{semester && <span>{semester.name}</span>}</div>
    </header>
    {data.demo && <aside className="books-demo"><strong>Prototype resources</strong><span>Sample lab guides for the presentation, not the official RGUKT syllabus. Follow your instructor’s approved lab manual.</span></aside>}
    {activeCurriculum?.branch && !experiment && <div className="books-selected-branch"><div><span>Selected Branch</span><strong>{activeCurriculum.branch.shortName ?? activeCurriculum.branch.name}</strong><p>{activeCurriculum.branch.name}</p></div><Link to={`${LABS_ROOT}?choose=branch`} aria-label="Change branch">Change <span aria-hidden="true">↗</span></Link></div>}
    {!experiment && <div className="books-search"><label htmlFor="lab-search">Search labs or experiments</label><div><Search size={17} aria-hidden="true" /><input id="lab-search" type="search" value={query} placeholder="Search labs or experiments..." onChange={event => setSearch({ path: viewKey, query: event.target.value })} />{query && <button type="button" aria-label="Clear search" onClick={() => setSearch({ path: viewKey, query: '' })}><X size={16} aria-hidden="true" /></button>}</div><p>{lab ? `Searching within ${lab.name}.` : semester ? 'Searching within this semester.' : activeCurriculum?.branch ? `Searching across semesters for ${activeCurriculum.branch.shortName ?? activeCurriculum.branch.name}.` : `Searching ${profile.academicLevel} resources.`}</p></div>}
    {query.trim() ? <LabSearchResults data={data} level={profile.academicLevel} query={query} scope={view} />
      : experiment ? <ExperimentGuide experiment={experiment} />
      : lab && curriculum && semester ? <section className="books-section"><h2>Experiments</h2><p className="books-section-copy">Choose an experiment to view its video or guide.</p><ExperimentList experiments={lab.experiments} curriculum={curriculum} semester={semester} lab={lab} /></section>
      : semester && curriculum ? <section className="books-section"><h2>Choose a Lab</h2><p className="books-section-copy">{semester.name} · {labs.length} {labs.length === 1 ? 'lab' : 'labs'}</p>{labs.length ? <LabGrid labs={labs} curriculum={curriculum} semester={semester} /> : <ResourceEmptyState icon={FlaskConical} title={branchEmpty ? 'Lab resources for this branch are being prepared.' : 'No labs have been added for this semester yet.'} description="More experiments will be added soon." />}</section>
      : activeCurriculum ? <section className="books-section"><h2>Choose Semester</h2><p className="books-section-copy">Find the practicals for your semester.</p>{activeCurriculum.semesters.length ? <div className="books-grid books-semester-grid">{activeCurriculum.semesters.map(item => <SelectionCard key={item.id} to={labsPath(activeCurriculum, item)} title={item.name} detail={`${getLabs(data, activeCurriculum.id, item.id).length} labs`} icon={CalendarDays} />)}</div> : <ResourceEmptyState icon={FlaskConical} title="Semesters are being prepared." />}</section>
      : <section className="books-section"><h2>{profile.academicLevel === 'E1' ? 'Choose Your Branch' : 'Lab Videos'}</h2><p className="books-section-copy">{profile.academicLevel === 'E1' ? 'Your branch helps us show the right lab resources. You can change it anytime.' : 'Resources for your academic level will appear here.'}</p>{curricula.some(c => c.branch) ? <div className="books-grid books-branch-grid">{curricula.filter(c => c.branch).map(item => <SelectionCard key={item.id} to={labsPath(item)} title={item.branch?.shortName ?? item.branch!.name} detail={item.branch!.name} icon={Network} onSelect={() => { setSelectedBranch(data, item.id); setSelected(item.id) }} />)}</div> : <ResourceEmptyState icon={FlaskConical} title="Lab resources are being prepared." description="More experiments will be added soon." />}</section>}
    <p className="books-source-note">{data.demo ? 'Prototype guides are for orientation. Reviewed instructions and approved videos will be added as they become available.' : 'Use these resources alongside your instructor’s lab manual.'}</p>
  </div>
}

export function LabSearchResults({ data, level, query, scope }: { data: LabCatalog; level: SupportedAcademicLevel; query: string; scope: LabsRoute }) {
  const results = searchLabResources(data, level, query, scope)
  return <section className="books-section" aria-label="Lab search results"><h2>Search results</h2><p className="books-section-copy" role="status">{results.length} {results.length === 1 ? 'lab' : 'labs'} matching “{query.trim()}”</p>
    {results.length ? results.map(result => <div className="books-search-group" key={result.lab.id}><Link className="books-result-heading" to={labsPath(result.curriculum, result.semester, result.lab)}>{result.lab.name}<span>{result.curriculum.level}{result.curriculum.branch ? ` · ${result.curriculum.branch.shortName ?? result.curriculum.branch.name}` : ''} · {result.semester.name}</span></Link>{!!result.experiments.length && <ExperimentList {...result} />}</div>) : <ResourceEmptyState icon={FlaskConical} title="No matching labs or experiments found." description="Try a different name or clear your search." />}
  </section>
}
