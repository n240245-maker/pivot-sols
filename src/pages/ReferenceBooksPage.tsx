import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { LoadingScreen } from '../components/common/LoadingScreen'
import type { StudentProfile } from '../types/student'
import type { ReferenceCatalog } from '../types/referenceBooks'
import { useContent } from '../contexts/ContentContext'
import { BOOKS_ROOT, booksPath, getBooks, getBooksBreadcrumbs, getCurriculaForLevel, resolveBooksRoute } from '../lib/referenceBooks'
import { getSelectedBranch, setSelectedBranch } from '../lib/branchPreference'
import { BranchSelector } from '../components/resources/books/BranchSelector'
import { SemesterSelector } from '../components/resources/books/SemesterSelector'
import { SubjectGrid } from '../components/resources/books/SubjectGrid'
import { BookList } from '../components/resources/books/BookList'
import { ResourceBreadcrumbs } from '../components/resources/books/ResourceBreadcrumbs'
import { ResourceEmptyState } from '../components/resources/books/ResourceEmptyState'
import { BooksSearch } from '../components/resources/books/BooksSearch'
import { BooksSearchResults } from '../components/resources/books/BooksSearchResults'

export function ReferenceBooksPage() {
  const { profile } = useAuth()
  const {data} = useContent()
  return profile ? <BooksContent profile={profile} data={data.books} /> : <LoadingScreen />
}

export function BooksContent({ profile, data }: { profile: StudentProfile; data: ReferenceCatalog }) {
  const { pathname, search: locationSearch } = useLocation()
  const viewKey = pathname + locationSearch
  const [search, setSearch] = useState({ path: viewKey, query: '' })
  const query = search.path === viewKey ? search.query : ''
  const [selected, setSelected] = useState(() => getSelectedBranch(data))
  const route = resolveBooksRoute(data, profile.academicLevel, pathname)
  const { curriculum, semester, subject } = route
  const curricula = getCurriculaForLevel(data, profile.academicLevel)
  const common = !curriculum && curricula.length === 1 && !curricula[0].branch ? curricula[0] : undefined
  const choosingBranch = !curriculum && profile.academicLevel === 'E1' && new URLSearchParams(locationSearch).get('choose') === 'branch'
  const preferred = profile.academicLevel === 'E1' && !choosingBranch ? curricula.find(c => c.id === selected && c.branch) : undefined
  const activeCurriculum = curriculum ?? common ?? preferred
  const view = { ...route, curriculum: activeCurriculum }
  useEffect(() => {
    if (route.valid && profile.academicLevel === 'E1' && curriculum?.branch) {
      setSelectedBranch(data, curriculum.id)
      setSelected(curriculum.id)
    }
  }, [data, curriculum, profile.academicLevel, route.valid])
  const back = subject && curriculum && semester ? { to: booksPath(curriculum, semester), label: 'Back to subjects' } : semester && curriculum ? { to: curriculum.branch ? booksPath(curriculum) : BOOKS_ROOT, label: 'Back to semesters' } : curriculum ? { to: BOOKS_ROOT, label: 'Back to Reference Books' } : { to: '/dashboard', label: 'Back to dashboard' }
  if (!route.valid) return <div className="books-page"><ResourceEmptyState title="Resource not found" description="This resource path isn't available for your academic level." /><Link className="pivot-back-link" to={BOOKS_ROOT}><ArrowLeft size={16} />Back to Reference Books</Link></div>
  return <div className="books-page">
    <ResourceBreadcrumbs items={getBooksBreadcrumbs(view, profile.academicLevel)} />
    <Link className="pivot-back-link" to={back.to}><ArrowLeft size={16} aria-hidden="true" />{back.label}</Link>
    <header className="books-heading"><p className="pivot-eyebrow"><BookOpen size={15} aria-hidden="true" /> Your academic bookshelf</p><h1>{subject?.name ?? 'Reference Books'}</h1><p className="books-intro">{subject ? 'Reference Books' : 'Find subject-wise books and study resources for your coursework.'}</p><div className="books-context"><span>Academic Level</span><span aria-label={`Academic level ${profile.academicLevel}`} className="pivot-level-badge">{profile.academicLevel}</span><span>{profile.studentId}</span>{activeCurriculum?.branch && <span>{activeCurriculum.branch.shortName ?? activeCurriculum.branch.name}</span>}{semester && <span>{semester.name}</span>}</div></header>
    {data.demo && <aside className="books-demo"><strong>Prototype resources</strong><span>Demo content for the presentation. The final RGUKT curriculum and resources may differ.</span></aside>}
    {activeCurriculum?.branch && <div className="books-selected-branch"><div><span>Selected Branch</span><strong>{activeCurriculum.branch.shortName ?? activeCurriculum.branch.name}</strong><p>{activeCurriculum.branch.name}</p></div><Link to={`${BOOKS_ROOT}?choose=branch`} aria-label="Change branch">Change <span aria-hidden="true">↗</span></Link></div>}
    <BooksSearch query={query} onChange={value => setSearch({ path: viewKey, query: value })} />
    {query.trim() ? <BooksSearchResults data={data} level={profile.academicLevel} query={query} scope={view} /> : subject ? <section className="books-section"><h2>Reference Books</h2><p className="books-section-copy">{data.demo ? 'Explore the reference listings. Open a book to view its details.' : 'Sources and availability are shown on each reference.'}</p><BookList books={getBooks(data, subject.id)} demo={data.demo} subjectName={subject.name} /></section> : semester && curriculum ? <SubjectGrid curriculum={curriculum} semester={semester} data={data} /> : activeCurriculum ? <SemesterSelector curriculum={activeCurriculum} data={data} /> : <BranchSelector curricula={curricula} selected={selected} onSelect={id => { setSelectedBranch(data, id); setSelected(id) }} />}
    <p className="books-source-note">{data.demo ? 'Reference listings only. Resource links will be added in the full version of Pivot Sols.' : 'Resources are provided through available official, institutional or openly accessible sources.'}</p>
  </div>
}
