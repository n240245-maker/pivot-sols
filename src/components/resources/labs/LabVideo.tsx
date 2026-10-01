import { useState } from 'react'
import { ExternalLink, Play, Video } from 'lucide-react'
import type { LabExperiment } from '../../../types/labVideos'
import { getLabVideoSource } from '../../../lib/labVideoSource'

export function LabVideo({ experiment }: { experiment: LabExperiment }) {
  // Key the state to the source so navigating between experiments resets the player.
  return <VideoPlayer key={`${experiment.id}:${experiment.videoType}:${experiment.videoUrl}`} experiment={experiment} />
}

function VideoPlayer({ experiment }: { experiment: LabExperiment }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const source = getLabVideoSource(experiment)
  const title = `Video: ${experiment.title}`
  if (!source || failed) return <div className="labs-video-placeholder" role="status">
    <Video size={30} strokeWidth={1.4} aria-hidden="true" />
    <strong>{failed || experiment.videoUrl ? 'Video unavailable' : 'Video coming soon'}</strong>
    <p>Experiment guide is available below.</p>
    {failed && source && <a href={source.url} target="_blank" rel="noopener noreferrer">Open video source <ExternalLink size={14} aria-hidden="true" /></a>}
  </div>
  if (source.type === 'external') return <div className="labs-video-placeholder">
    <Video size={30} strokeWidth={1.4} aria-hidden="true" /><strong>Watch the experiment</strong>
    <p>This video opens on the provider’s website.</p>
    <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${experiment.title} (opens in a new tab)`}>Open video <ExternalLink size={14} aria-hidden="true" /></a>
  </div>
  if (source.type === 'mp4') return <div className="labs-video-frame"><video controls playsInline preload="none" aria-label={title} onError={() => setFailed(true)} src={source.url}>Your browser cannot play this video. <a href={source.url}>Open the video source</a>.</video></div>
  if (!loaded) return <div className="labs-video-placeholder">
    <Play size={30} strokeWidth={1.4} aria-hidden="true" /><strong>Experiment video</strong>
    <p>YouTube loads only when you choose to continue.</p>
    <button type="button" onClick={() => setLoaded(true)} aria-label={`Load video: ${experiment.title}`}>Load video{experiment.duration ? ` · ${experiment.duration}` : ''}</button>
  </div>
  return <div className="labs-youtube">
    <div className="labs-video-frame"><iframe title={title} src={`https://www.youtube-nocookie.com/embed/${source.id}?autoplay=0&rel=0`} loading="eager" referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen onError={() => setFailed(true)} /></div>
    <p className="labs-player-help">If the player is unavailable, <a href={source.url} target="_blank" rel="noopener noreferrer">watch on YouTube <ExternalLink size={12} aria-hidden="true" /></a>.</p>
  </div>
}
