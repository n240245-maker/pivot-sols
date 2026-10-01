import { Check, Minus } from 'lucide-react'
import { getAcademicLevel, getBatchFromStudentId, isSupportedAcademicLevel } from '../../lib/studentValidation'

export function DetectedYear({ studentId }: { studentId: string }) {
  const batch = getBatchFromStudentId(studentId)
  const level = getAcademicLevel(batch)
  const supported = isSupportedAcademicLevel(level)
  return (
    <div className="detected-year">
      <span>Detected Year</span>
      <output aria-live="polite" className={batch !== null && supported ? 'year-supported' : ''}>
        {batch === null ? 'Waiting for valid RGUKT ID' : supported ? level : 'Currently unsupported'}
        {batch !== null && supported ? <Check size={16} aria-hidden="true" /> : <Minus size={15} aria-hidden="true" />}
      </output>
    </div>
  )
}
