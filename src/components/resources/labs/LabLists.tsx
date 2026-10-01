import { Link } from 'react-router'
import { ArrowRight, ArrowUpRight, FlaskConical } from 'lucide-react'
import type { Lab, LabExperiment } from '../../../types/labVideos'
import type { Curriculum, Semester } from '../../../types/referenceBooks'
import { labsPath } from '../../../lib/labVideos'
import { ResourceEmptyState } from '../books/ResourceEmptyState'

export function LabGrid({ labs, curriculum, semester }: { labs: readonly Lab[]; curriculum: Curriculum; semester: Semester }) {
  return <div className="books-grid labs-grid">{labs.map(lab => <Link key={lab.id} className="books-selection-card labs-card" to={labsPath(curriculum, semester, lab)}>
    <span className="books-icon"><FlaskConical size={23} strokeWidth={1.5} aria-hidden="true" /></span>
    <h3>{lab.name}</h3><span className="labs-count">{lab.experiments.length} {lab.experiments.length === 1 ? 'experiment' : 'experiments'}</span>
    {lab.shortDescription && <p>{lab.shortDescription}</p>}<ArrowUpRight className="books-arrow" size={19} aria-hidden="true" />
  </Link>)}</div>
}

export function ExperimentList({ experiments, curriculum, semester, lab }: { experiments: readonly LabExperiment[]; curriculum: Curriculum; semester: Semester; lab: Lab }) {
  if (!experiments.length) return <ResourceEmptyState icon={FlaskConical} title="Experiments for this lab are being prepared." description="More experiments will be added soon." />
  return <ul className="labs-experiments">{experiments.map(experiment => <li key={experiment.id}><Link to={labsPath(curriculum, semester, lab, experiment)}>
    {experiment.experimentNumber !== undefined && <span className="labs-experiment-number" aria-label={`Experiment ${experiment.experimentNumber}`}>{String(experiment.experimentNumber).padStart(2, '0')}</span>}
    <span className="labs-experiment-copy"><strong>{experiment.title}</strong><span>Watch &amp; Learn</span></span><ArrowRight size={18} aria-hidden="true" />
  </Link></li>)}</ul>
}
