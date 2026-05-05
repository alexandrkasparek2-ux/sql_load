import type { Segment } from '../types/api'

interface Props {
  segments: Segment[]
  onToggle: (id: string) => void
  onSeek: (t: number) => void
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'
  return <span className={`font-mono text-sm font-bold ${color}`}>{score}</span>
}

export function SegmentList({ segments, onToggle, onSeek }: Props) {
  const keepCount = segments.filter((s) => s.action === 'keep').length
  const cutCount = segments.length - keepCount
  const keepDuration = segments
    .filter((s) => s.action === 'keep')
    .reduce((acc, s) => acc + s.duration, 0)

  const formatDur = (s: number) => {
    if (s < 60) return `${s.toFixed(0)}s`
    return `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`
  }

  return (
    <div className="bg-zinc-900 rounded-xl flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-4 flex-wrap">
        <p className="text-zinc-400 text-xs uppercase tracking-wider flex-1">Segmenty</p>
        <span className="text-emerald-400 text-xs">{keepCount} ponecháno</span>
        <span className="text-red-400 text-xs">{cutCount} vystřiženo</span>
        <span className="text-zinc-400 text-xs">výsledek: {formatDur(keepDuration)}</span>
      </div>

      <div className="overflow-y-auto max-h-72 divide-y divide-zinc-800/50">
        {segments.map((seg) => (
          <div
            key={seg.id}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/40 transition-colors"
          >
            <span
              className={`
                text-xs font-bold px-2 py-0.5 rounded min-w-[3.5rem] text-center
                ${seg.action === 'keep'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }
              `}
            >
              {seg.action.toUpperCase()}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-zinc-300 text-sm font-mono">
                  {formatTime(seg.start)} – {formatTime(seg.end)}
                </span>
                <ScoreBadge score={seg.score} />
              </div>
              {seg.reason && (
                <p className="text-zinc-500 text-xs truncate mt-0.5">{seg.reason}</p>
              )}
              {seg.issues.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {seg.issues.map((issue) => (
                    <span key={issue} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                      {issue}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => onSeek(seg.start)}
                className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                title="Přejít"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={() => onToggle(seg.id)}
                className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                title="Invertovat"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
