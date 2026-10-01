import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronDown, UserRound } from 'lucide-react'
import type { StudentProfile } from '../../types/student'
import { InitialsAvatar } from './InitialsAvatar'
import { getDisplayName } from '../../lib/studentDisplay'

export function ProfileMenu({ profile, logoutAction }: { profile: StudentProfile; logoutAction: ReactNode }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const profileLinkRef = useRef<HTMLAnchorElement>(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    profileLinkRef.current?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])
  return <div className="pivot-profile-menu" ref={rootRef} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false)
  }}>
    <button type="button" className="pivot-profile-trigger" ref={triggerRef} aria-label="Open profile menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} onKeyDown={(event) => {
      if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true) }
    }}>
      <InitialsAvatar name={profile.name} /><span>{getDisplayName(profile.name)}</span><ChevronDown size={14} aria-hidden="true" />
    </button>
    {open && <div className="pivot-profile-dropdown" id={id}>
      <div className="pivot-dropdown-identity"><strong>{profile.name}</strong><span>{profile.studentId} · {profile.academicLevel}</span></div>
      <Link ref={profileLinkRef} to="/profile" onClick={() => setOpen(false)}><UserRound size={17} strokeWidth={1.6} aria-hidden="true" />Profile</Link>
      {logoutAction}
    </div>}
  </div>
}
