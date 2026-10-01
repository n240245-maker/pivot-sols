import { Link } from 'react-router'

export function Logo() {
  return (
    <Link to="/" className="brand" aria-label="Pivot Sols home">
      <span className="brand-mark" aria-hidden="true"><span /></span>
      <span>Pivot Sols</span>
    </Link>
  )
}
