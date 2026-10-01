export const careerCategories = ['Software', 'AI & Data', 'Hardware', 'Electronics', 'Infrastructure', 'Security', 'Core Engineering'] as const
export type CareerCategory = typeof careerCategories[number]
export type LearningLevel = 'Low' | 'Moderate' | 'High'
export interface RoadmapStage { title: string; description: string }
export interface CareerDomain {
  id: string; slug: string; name: string; category: CareerCategory
  description: string; overview: string; work: readonly string[]
  skills: readonly string[]; subjects: readonly string[]; tools: readonly string[]
  programming: LearningLevel; mathematics: LearningLevel
  interests: readonly string[]; roleIds: readonly string[]; roadmap: readonly RoadmapStage[]
  supportingSkills?: readonly string[]; challenges?: readonly string[]
}
export interface CareerRole {
  id: string; slug: string; name: string; domainSlug: string
  description: string; responsibilities: readonly string[]
  summary?: string
  skills: readonly string[]; subjects: readonly string[]; tools: readonly string[]; technologies: readonly string[]
  programming: LearningLevel; mathematics: LearningLevel
  roadmap: readonly RoadmapStage[]; interviewTopics: readonly string[]; projects: readonly string[]
}
