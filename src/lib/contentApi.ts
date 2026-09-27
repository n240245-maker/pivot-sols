import { API_BASE_URL } from '../config/api'
import type { PublicContent } from '../types/content'

export async function fetchPublishedContent(signal?: AbortSignal): Promise<PublicContent> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/catalog`, {signal,credentials:'omit',cache:'no-store'})
    if (!response.ok) throw new Error()
    const value: unknown = await response.json()
    if (!value || typeof value !== 'object') throw new Error()
    const data = value as Partial<PublicContent>
    if (!data.books || !Array.isArray(data.books.curricula) || !Array.isArray(data.books.subjects) || !Array.isArray(data.books.books)
      || !data.labs || !Array.isArray(data.labs.labs) || !Array.isArray(data.labs.curricula)
      || !Array.isArray(data.domains) || !Array.isArray(data.roles) || !Array.isArray(data.branches)
      || !data.site || typeof data.site !== 'object') throw new Error()
    return {...data,rooms:Array.isArray(data.rooms)?data.rooms:[],faculty_subjects:Array.isArray(data.faculty_subjects)?data.faculty_subjects:[],faculty:Array.isArray(data.faculty)?data.faculty:[],career_resources:Array.isArray(data.career_resources)?data.career_resources:[]} as PublicContent
  } catch {
    throw new Error("We couldn't load this content.")
  }
}
