import { Fingerprint, GraduationCap, MapPin } from 'lucide-react'
import type { StudentProfile } from '../../types/student'

export function StudentContext({ profile }: { profile: StudentProfile }) {
  const context = [
    { label: 'Academic level', value: profile.academicLevel, icon: GraduationCap },
    { label: 'Campus', value: `RGUKT ${profile.campus}`, icon: MapPin },
    { label: 'Student ID', value: profile.studentId, icon: Fingerprint },
  ]
  return <section className="pivot-context-section" aria-labelledby="pivot-context-heading"><h2 id="pivot-context-heading">Your Pivot</h2><dl className="pivot-context-strip">{context.map(({ label, value, icon: Icon }) => <div key={label}><Icon size={19} strokeWidth={1.5} aria-hidden="true" /><div><dt>{label}</dt><dd>{value}</dd></div></div>)}</dl></section>
}
