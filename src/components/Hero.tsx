import { motion, useReducedMotion } from 'motion/react'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'

export function Hero() {
  const reducedMotion = useReducedMotion()
  const reveal = {
    hidden: { opacity: 0, y: reducedMotion ? 0 : 12 },
    visible: { opacity: 1, y: 0, transition: { duration: reducedMotion ? 0 : 0.65 } },
  }

  return (
    <main id="main-content" className="hero relative z-10 flex flex-1 items-center justify-center">
      <motion.div
        className="hero-content"
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: reducedMotion ? 0 : 0.1, delayChildren: reducedMotion ? 0 : 0.12 }}
      >
        <motion.p variants={reveal} className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          Built for RGUKT Nuzvid students
        </motion.p>
        <motion.h1 variants={reveal} id="problems">
          <span>Find the problem.</span>
          <span className="gradient-text">Pivot to the solution.</span>
        </motion.h1>
        <motion.p variants={reveal} className="hero-subtitle">
          Academic resources, campus solutions, lab support and career guidance — built around the problems RGUKT students actually face.
        </motion.p>
        <motion.div variants={reveal} className="hero-actions">
          <Link to="/signup" className="button button-primary group">
            Get Started <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <a href="#resources" className="button button-secondary">
            Explore Platform <ArrowDown size={16} aria-hidden="true" />
          </a>
        </motion.div>
        <motion.p variants={reveal} className="supporting-text" id="about">
          For P1 &amp; E1 students <span aria-hidden="true">·</span> RGUKT Nuzvid
        </motion.p>
      </motion.div>
    </main>
  )
}
