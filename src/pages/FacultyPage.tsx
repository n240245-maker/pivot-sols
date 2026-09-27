import { useState } from 'react'
import { useContent } from '../contexts/ContentContext'
import type { FacultyMember } from '../types/content'

export function facultyForSubject(members: readonly FacultyMember[], subjectId: string) {
  return members.filter(member => member.subject_id === subjectId)
}

export function FacultyPage() {
  const { data } = useContent()
  const [subjectId, setSubjectId] = useState('')
  const selected = data.faculty_subjects.find(subject => subject.id === subjectId) ?? data.faculty_subjects[0]
  const members = facultyForSubject(data.faculty, selected?.id ?? '')
  return <div className="discovery-page"><header className="directory-heading"><p className="pivot-eyebrow">P1</p><h1>Faculty Directory</h1><p>Select a subject to find its published faculty.</p></header>
    {data.faculty_subjects.length > 0 && <div className="directory-tabs" role="tablist" aria-label="Faculty subjects">{data.faculty_subjects.map(subject => <button role="tab" aria-selected={selected?.id === subject.id} key={subject.id} type="button" onClick={() => setSubjectId(subject.id)}>{subject.name}</button>)}</div>}
    {members.length ? <div className="directory-grid">{members.map(member => <article className="directory-card" key={member.id}>{member.image_url && <img className="faculty-photo" src={member.image_url} alt="" loading="lazy" />}<h2>{member.name}</h2><p>{selected?.name}</p>{member.designation && <p>{member.designation}</p>}{member.mobile_number && <p><strong>Mobile:</strong> {member.mobile_number}</p>}{member.email && <p><strong>Email:</strong> {member.email}</p>}{member.room_number && <p><strong>Room:</strong> {member.room_number}</p>}<div className="directory-actions">{member.mobile_number && <a href={`tel:${member.mobile_number.replace(/[^\d+]/g, '')}`}>Call</a>}{member.email && <a href={`mailto:${member.email}`}>Email</a>}</div></article>)}</div>
      : <div className="content-state"><h2>No faculty information has been published for this subject yet.</h2></div>}</div>
}
