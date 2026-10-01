import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { Link } from 'react-router'
import { Logo } from './Logo'

const navigation = [
  { label: 'Home', href: '#home' },
  { label: 'Problems', href: '#problems' },
  { label: 'Resources', href: '#resources' },
  { label: 'Careers', href: '#resources' },
  { label: 'About', href: '#about' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const desktop = window.matchMedia('(min-width: 1024px)')
    const onResize = () => { if (desktop.matches) setOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    desktop.addEventListener('change', onResize)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
      desktop.removeEventListener('change', onResize)
    }
  }, [open])

  return (
    <header className="site-header relative z-20 px-6 py-5 md:px-8" ref={headerRef}>
      <div className="navbar-inner">
        <Logo />
        <nav aria-label="Main navigation" className="desktop-nav hidden lg:flex">
          {navigation.map(({ label, href }, index) => (
            <a key={label} href={href} aria-current={index === 0 ? 'page' : undefined}>{label}</a>
          ))}
        </nav>
        <div className="nav-actions">
          <Link to="/signup" className="button button-nav">Sign Up</Link>
          <button
            ref={toggleRef}
            type="button"
            className="menu-toggle lg:hidden"
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="mobile-nav lg:hidden"
            initial={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
            onBlur={(event) => {
              if (!headerRef.current?.contains(event.relatedTarget as Node)) setOpen(false)
            }}
          >
            {navigation.map(({ label, href }) => (
              <a key={label} href={href} onClick={() => setOpen(false)}>{label}</a>
            ))}
            <Link to="/signup" className="mobile-signup" onClick={() => setOpen(false)}>Sign Up</Link>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
