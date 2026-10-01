import { useEffect, useRef } from 'react'

const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4'
const FADE_SECONDS = 0.5
const RESTART_DELAY_MS = 100

export function VideoBackground({ paused }: { paused: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let disposed = false
    let frame = 0
    let restartTimeout: ReturnType<typeof setTimeout> | undefined

    const stopFrame = () => cancelAnimationFrame(frame)
    const paintOpacity = () => {
      if (disposed) return
      const { currentTime, duration } = video
      // Media time keeps the fade aligned through buffering and playback stalls.
      const fadeIn = Math.min(currentTime / FADE_SECONDS, 1)
      const fadeOut = Number.isFinite(duration)
        ? Math.min((duration - currentTime) / FADE_SECONDS, 1)
        : 1
      video.style.opacity = String(Math.max(0, Math.min(fadeIn, fadeOut)))
      if (!video.paused && !video.ended) frame = requestAnimationFrame(paintOpacity)
    }
    const play = () => {
      if (disposed || paused || document.hidden) return
      // Autoplay may be denied or interrupted by unmount; retain the dark fallback.
      void video.play().catch(() => { if (!disposed) video.style.opacity = '0' })
    }
    const onPlaying = () => {
      stopFrame()
      frame = requestAnimationFrame(paintOpacity)
    }
    const onEnded = () => {
      stopFrame()
      video.style.opacity = '0'
      video.currentTime = 0
      clearTimeout(restartTimeout)
      restartTimeout = setTimeout(play, RESTART_DELAY_MS)
    }
    const onVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(restartTimeout)
        stopFrame()
        video.pause()
      } else play()
    }
    const onError = () => {
      stopFrame()
      clearTimeout(restartTimeout)
      video.style.opacity = '0'
    }

    video.addEventListener('playing', onPlaying)
    video.addEventListener('ended', onEnded)
    video.addEventListener('error', onError)
    document.addEventListener('visibilitychange', onVisibilityChange)
    if (paused) video.pause()
    else play()

    return () => {
      disposed = true
      stopFrame()
      clearTimeout(restartTimeout)
      video.pause()
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('error', onError)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [paused])

  return (
    <video
      ref={videoRef}
      className="video-background absolute inset-0 h-full w-full object-cover"
      src={VIDEO_URL}
      muted
      playsInline
      preload={paused ? 'none' : 'auto'}
      aria-hidden="true"
      tabIndex={-1}
      disablePictureInPicture
    />
  )
}
