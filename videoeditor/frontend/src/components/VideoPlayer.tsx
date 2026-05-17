import { useRef, useEffect } from 'react'

interface Props {
  src: string
  currentTimeRef: React.MutableRefObject<number>
  onTimeUpdate?: (t: number) => void
  seekTo?: number | null
}

export function VideoPlayer({ src, currentTimeRef, onTimeUpdate, seekTo }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (seekTo !== null && seekTo !== undefined && videoRef.current) {
      videoRef.current.currentTime = seekTo
    }
  }, [seekTo])

  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        src={src}
        controls
        className="w-full max-h-[400px] object-contain bg-black"
        onTimeUpdate={() => {
          if (videoRef.current) {
            currentTimeRef.current = videoRef.current.currentTime
            onTimeUpdate?.(videoRef.current.currentTime)
          }
        }}
      />
    </div>
  )
}
