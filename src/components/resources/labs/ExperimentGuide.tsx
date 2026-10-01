import { ShieldCheck } from 'lucide-react'
import type { LabExperiment } from '../../../types/labVideos'
import { LabVideo } from './LabVideo'

export function ExperimentGuide({ experiment }: { experiment: LabExperiment }) {
  return <article className="labs-guide" aria-label={`${experiment.title} guide`}>
    <section className="labs-video-section" aria-labelledby="lab-video-title"><h2 id="lab-video-title">Video</h2><LabVideo experiment={experiment} /></section>
    <div className="labs-guide-sections">
      {experiment.objective && <section><h2>Objective</h2><p>{experiment.objective}</p></section>}
      {!!experiment.apparatus?.length && <section><h2>Apparatus Required</h2><ul className="labs-apparatus">{experiment.apparatus.map((item, i) => <li key={i}>{item}</li>)}</ul></section>}
      {experiment.theory && <section><h2>Theory</h2><p>{experiment.theory}</p></section>}
      {!!experiment.procedure?.length && <section><h2>Procedure</h2><ol className="labs-procedure">{experiment.procedure.map((step, i) => <li key={i}>{step}</li>)}</ol></section>}
      {experiment.expectedResult && <section className="labs-result"><h2>Expected Result</h2><p>{experiment.expectedResult}</p></section>}
      {!!experiment.precautions?.length && <section className="labs-precautions"><h2><ShieldCheck size={19} aria-hidden="true" />Precautions</h2><ul>{experiment.precautions.map((item, i) => <li key={i}>{item}</li>)}</ul></section>}
    </div>
  </article>
}
