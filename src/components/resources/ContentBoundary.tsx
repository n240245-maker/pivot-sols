import type {ReactNode} from 'react'
import {useContent} from '../../contexts/ContentContext'

export function ContentBoundary({children}:{children:ReactNode}) {
  const {status,reload}=useContent()
  if(status==='loading')return <div className="content-state" role="status">Loading resources...</div>
  if(status==='error')return <div className="content-state" role="alert"><p>We couldn't load this content.</p><button type="button" className="button button-secondary" onClick={reload}>Try Again</button></div>
  return <>{children}</>
}
