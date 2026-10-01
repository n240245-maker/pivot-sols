import { useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Hero } from '../components/Hero'
import { Navbar } from '../components/Navbar'
import { ResourceMarquee } from '../components/ResourceMarquee'
import { VideoBackground } from '../components/VideoBackground'

export function LandingPage() {
  const reducedMotion = useReducedMotion() ?? false
  const [manuallyPaused, setManuallyPaused] = useState(false)
  const paused = reducedMotion || manuallyPaused

  return (
    <div id="home" className="landing-page relative flex min-h-screen flex-col overflow-hidden">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <VideoBackground paused={paused} />
      <div className="readability-blur" aria-hidden="true" />
      <Navbar />
      <Hero />
      <ResourceMarquee paused={paused} onToggle={() => setManuallyPaused(!manuallyPaused)} reducedMotion={reducedMotion} />
    </div>
  )
}
