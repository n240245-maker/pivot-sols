import { BookOpen, BriefcaseBusiness, Compass, FlaskConical, GraduationCap, Lightbulb, Pause, Play } from 'lucide-react'

const resources = [
  { label: 'Reference Books', icon: BookOpen },
  { label: 'Lab Videos', icon: FlaskConical },
  { label: 'Career Domains', icon: Compass },
  { label: 'Career Jobs', icon: BriefcaseBusiness },
  { label: 'Campus Solutions', icon: Lightbulb },
  { label: 'Student Resources', icon: GraduationCap },
]

export function ResourceMarquee({ paused, onToggle, reducedMotion }: {
  paused: boolean
  onToggle: () => void
  reducedMotion: boolean
}) {
  return (
    <footer id="resources" className="resource-footer relative z-10" tabIndex={-1}>
      <div className="resource-inner">
        <p className="resource-caption">Built around<br className="hidden lg:block" /> student needs</p>
        <div className="marquee-window" role="region" aria-label="Platform resources" tabIndex={0}>
          <div className="marquee-track" style={{ animationPlayState: paused ? 'paused' : 'running' }}>
            {[0, 1].map((copy) => (
              <ul className="marquee-sequence" key={copy} aria-hidden={copy === 1 ? true : undefined}>
                {resources.map(({ label, icon: Icon }) => (
                  <li key={label}>
                    <span className="liquid-glass resource-icon"><Icon size={17} strokeWidth={1.5} aria-hidden="true" /></span>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
        {!reducedMotion && (
          <button type="button" className="motion-toggle" aria-label={paused ? 'Play background animations' : 'Pause background animations'} onClick={onToggle}>
            {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
          </button>
        )}
      </div>
    </footer>
  )
}
