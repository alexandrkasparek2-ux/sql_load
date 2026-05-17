import { useEffect, useRef, useState } from 'react'
import type { Segment } from '../types/api'

interface Props {
  segments: Segment[]
  currentTime: number
  onSeek: (t: number) => void
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function Timeline({ segments, currentTime, onSeek }: Props) {
  const totalDuration = segments.reduce((acc, s) => Math.max(acc, s.end), 0)
  const barRef = useRef<HTMLDivElement>(null)
  const [playheadPct, setPlayheadPct] = useState(0)

  useEffect(() => {
    if (totalDuration > 0) {
      setPlayheadPct((currentTime / totalDuration) * 100)
    }
  }, [currentTime, totalDuration])

  const handleClick = (e: React.MouseEvent) => {
    if (!barRef.current || totalDuration === 0) return
    const rect = barRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.max(0, Math.min(1, x / rect.width))
    onSeek(pct * totalDuration)
  }

  if (segments.length === 0) return null

  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <p className="text-zinc-400 text-xs mb-2 uppercase tracking-wider">Timeline</p>

      <div
        ref={barRef}
        className="relative h-10 rounded-lg overflow-hidden cursor-pointer bg-zinc-800 select-none"
        onClick={handleClick}
      >
        {segments.map((seg) => {
          const left = (seg.start / totalDuration) * 100
          const width = (seg.duration / totalDuration) * 100

          return (
            <div
              key={seg.id}
              className={`
                absolute top-0 h-full border-r border-zinc-950 transition-opacity hover:opacity-90
                ${seg.action === 'keep'
                  ? 'bg-emerald-500/30 border-l border-emerald-500/70'
                  : 'bg-red-500/20 border-l border-red-500/30'
                }
              `}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${formatTime(seg.start)} – ${formatTime(seg.end)} · ${seg.action.toUpperCase()} · ${seg.score}`}
              onClick={(e) => {
                e.stopPropagation()
                onSeek(seg.start)
              }}
            />
          )
        })}

        {/* Playhead */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white/80 pointer-events-none z-10"
          style={{ left: `${playheadPct}%` }}
        />
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-zinc-500 text-xs">{formatTime(0)}</span>
        <span className="text-zinc-500 text-xs">{formatTime(totalDuration)}</span>
      </div>
    </div>
  )
}
