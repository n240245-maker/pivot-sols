import { ArrowLeft, MessageCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { InputGroup } from '../components/auth/InputGroup'
import { LoadingScreen } from '../components/common/LoadingScreen'
import type { StudentProfile } from '../types/student'
import { sendContactMessage, validateContact } from '../lib/contactApi'

export function ContactPage() {
  const { profile } = useAuth()
  return profile ? <ContactContent profile={profile} /> : <LoadingScreen />
}

export function ContactContent({ profile }: { profile: StudentProfile }) {
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email ?? '')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const pending = useRef(false)
  const edited = () => { setSent(false); setError('') }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (pending.current) return
    setError(''); setSent(false)
    const body = {name,email,message}
    const validation = validateContact(body)
    if (validation) { setError(validation); return }
    pending.current = true; setBusy(true)
    try { await sendContactMessage(body); setSent(true); setMessage('') }
    catch (failure) { setError(failure instanceof Error ? failure.message : "We couldn't send your message. Please try again.") }
    finally { pending.current = false; setBusy(false) }
  }
  return <div className="pivot-contact-page">
    <Link to="/dashboard" className="pivot-back-link"><ArrowLeft size={16} aria-hidden="true" />Back to dashboard</Link>
    <p className="pivot-eyebrow">A better campus experience, together</p><h1>Contact Pivot Sols</h1>
    <p className="pivot-page-description">Have a suggestion, resource or problem we should know about?</p>
    <form className="pivot-contact-form" onSubmit={submit} aria-describedby="contact-availability" aria-busy={busy} noValidate>
      <div className="pivot-contact-fields"><InputGroup id="contact-name" label="Name" value={name} onChange={event=>{setName(event.target.value);edited()}} autoComplete="name" minLength={2} maxLength={100} required disabled={busy} /><InputGroup id="contact-email" label="Email" type="email" value={email} onChange={event=>{setEmail(event.target.value);edited()}} autoComplete="email" maxLength={254} required disabled={busy} /></div>
      <div className="input-group"><label htmlFor="contact-message">Message</label><textarea id="contact-message" name="message" value={message} onChange={event=>{setMessage(event.target.value);edited()}} rows={6} placeholder="What would you like to share?" minLength={10} maxLength={3000} required disabled={busy} aria-describedby="contact-message-hint" /><p id="contact-message-hint" className="field-hint">10–3000 characters. Please leave out passwords and verification codes.</p></div>
      {error&&<p className="field-error" role="alert">{error}</p>}{sent&&<p className="contact-success" role="status">Message sent successfully.</p>}
      <div className="pivot-contact-actions"><p id="contact-availability"><MessageCircle size={17} aria-hidden="true" />Enter a reply address so we can respond to your message.</p><button type="submit" className="button button-primary" disabled={busy}>{busy?'Sending message...':'Send message'}</button></div>
    </form>
  </div>
}
