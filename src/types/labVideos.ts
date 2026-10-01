import type { Curriculum } from './referenceBooks'

export interface LabExperiment {
  id: string
  title: string
  slug: string
  experimentNumber?: number
  objective?: string
  theory?: string
  apparatus?: readonly string[]
  procedure?: readonly string[]
  expectedResult?: string
  precautions?: readonly string[]
  videoUrl?: string
  videoType?: 'youtube' | 'mp4' | 'external'
  thumbnailUrl?: string
  duration?: string
}

export interface Lab {
  id: string
  curriculumId: string
  semesterId: string
  name: string
  slug: string
  shortDescription?: string
  experiments: readonly LabExperiment[]
}

export interface LabCatalog {
  demo: boolean
  curricula: readonly Curriculum[]
  labs: readonly Lab[]
}
