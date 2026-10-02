export type AcademicLevel = 'P1' | 'E1' | 'UNSUPPORTED'
export type SupportedAcademicLevel = Exclude<AcademicLevel, 'UNSUPPORTED'>

export interface StudentProfile {
  id: string
  studentId: string
  name: string
  email?: string
  batch: number
  academicLevel: SupportedAcademicLevel
  campus: 'Nuzvid'
}

export interface RegistrationValues {
  name: string
  studentId: string
  email: string
  password: string
}

export type RegistrationErrors = Partial<Record<keyof RegistrationValues, string>>
