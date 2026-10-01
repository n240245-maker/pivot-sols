import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Pause, Play } from 'lucide-react'
import { Logo } from '../Logo'

const AUTH_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_081238_406ed0e3-5d83-436e-a512-0bbff7ec5b95.mp4'
const steps = ['Verify your RGUKT identity', 'Set up your student profile', 'Enter your Pivot Sols dashboard']

export function AuthVideoPanel({ activeStep = 1 }: { activeStep?: number }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const reducedMotion = useReducedMotion()
  const [paused, setPaused] = useState(false)
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const update = () => setDesktop(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const update = () => {
      if (paused || reducedMotion || document.hidden) video.pause()
      else void video.play().catch(() => undefined)
    }
    update()
    document.addEventListener('visibilitychange', update)
    return () => { video.pause(); document.removeEventListener('visibilitychange', update) }
  }, [paused, reducedMotion, desktop])

  return (
    <aside className="auth-video-panel" aria-label="Your Pivot Sols journey">
      {desktop && <video ref={videoRef} src={AUTH_VIDEO} autoPlay={!reducedMotion} muted loop playsInline preload={reducedMotion ? 'none' : 'auto'} aria-hidden="true" tabIndex={-1} />}
      <div className="auth-panel-top"><Logo />{!reducedMotion && <button type="button" className="motion-toggle" onClick={() => setPaused(!paused)} aria-label={paused ? 'Play background video' : 'Pause background video'}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>}</div>
      <motion.div className="auth-panel-copy" initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="auth-kicker">A space for your next step</p>
        <h2>Your RGUKT journey,<br />made simpler.</h2>
        <p>Access solutions, academic resources and career guidance built around the problems students actually face.</p>
      </motion.div>
      <ol className="auth-steps">
        {steps.map((step, index) => <motion.li key={step} className={activeStep === index + 1 ? 'is-active' : ''} aria-current={activeStep === index + 1 ? 'step' : undefined} initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: reducedMotion ? 0 : index * 0.1 }}><span>0{index + 1}</span>{step}</motion.li>)}
      </ol>
    </aside>
  )
}
