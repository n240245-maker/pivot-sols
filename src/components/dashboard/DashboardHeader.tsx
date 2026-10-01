import { useEffect, useState } from 'react'
import { GraduationCap } from 'lucide-react'
import type { StudentProfile } from '../../types/student'
import { getDisplayName, getGreeting } from '../../lib/studentDisplay'

export function DashboardHeader({ profile }: { profile: StudentProfile }) {
  const [greeting, setGreeting] = useState(() => getGreeting())
  useEffect(() => {
    const update = () => setGreeting(getGreeting())
    const timer = setInterval(update, 60_000)
    document.addEventListener('visibilitychange', update)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update) }
  }, [])
  return <section className="pivot-welcome" aria-labelledby="dashboard-greeting">
    <p className="pivot-eyebrow">A little direction. A lot of possibility.</p>
    <h1 id="dashboard-greeting">{greeting}, {getDisplayName(profile.name)}</h1>
    <div className="pivot-student-meta"><span>{profile.studentId}</span><span aria-hidden="true">·</span><span className="pivot-level-badge">{profile.academicLevel}</span></div>
    <p className="pivot-welcome-campus"><GraduationCap size={15} strokeWidth={1.6} aria-hidden="true" />RGUKT {profile.campus}</p>
    <p className="pivot-welcome-copy">Everything you need to navigate academics, labs and careers — in one place.</p>
  </section>
}
