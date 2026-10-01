import type { LabExperiment } from '../types/labVideos'
import { safeResourceUrl } from './referenceBooks'

export type LabVideoSource = { type: 'youtube'; id: string; url: string } | { type: 'mp4'; url: string } | { type: 'external'; url: string }

export function youtubeVideoId(value: string): string | undefined {
  const safe = safeResourceUrl(value)
  if (!safe || !safe.startsWith('https://')) return undefined
  const url = new URL(safe)
  if (url.port) return undefined
  let id: string | null = null
  if (url.hostname === 'youtu.be' && /^\/[^/]+\/?$/.test(url.pathname)) id = url.pathname.split('/')[1]
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com'].includes(url.hostname)) {
    if (url.pathname === '/watch' && !url.hostname.includes('nocookie')) id = url.searchParams.get('v')
    else if (/^\/(embed|shorts)\/[^/]+\/?$/.test(url.pathname)) id = url.pathname.split('/')[2]
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : undefined
}

export function getLabVideoSource(experiment: Pick<LabExperiment, 'videoType' | 'videoUrl'>): LabVideoSource | undefined {
  const url = safeResourceUrl(experiment.videoUrl)
  if (!url) return undefined
  const id = youtubeVideoId(url)
  if (experiment.videoType === 'youtube' || (!experiment.videoType && id)) return id ? { type: 'youtube', id, url: `https://www.youtube.com/watch?v=${id}` } : undefined
  const pathname = url.startsWith('/') ? url.split(/[?#]/)[0] : new URL(url).pathname
  if (experiment.videoType === 'mp4' || (!experiment.videoType && /\.mp4$/i.test(pathname))) return /\.mp4$/i.test(pathname) ? { type: 'mp4', url } : undefined
  if (experiment.videoType === 'external' && url.startsWith('https://')) return { type: 'external', url }
  return undefined
}
