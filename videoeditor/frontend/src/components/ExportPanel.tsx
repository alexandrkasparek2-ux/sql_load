import { useState, useEffect } from 'react'
import type { Segment } from '../types/api'
import { api } from '../api/client'
import { useJob } from '../hooks/useJob'

interface Props {
  jobId: string
  segments: Segment[]
}

export function ExportPanel({ jobId, segments }: Props) {
  const [exportJobId, setExportJobId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const status = useJob(exporting ? exportJobId : null)

  const keepCount = segments.filter((s) => s.action === 'keep').length
  const isReady = status?.status === 'done' && status?.download_url

  useEffect(() => {
    if (status?.status === 'done' && exporting) {
      setExporting(false)
    }
  }, [status?.status, exporting])

  const handleExport = async () => {
    setError(null)
    setExporting(true)
    try {
      const res = await api.export(jobId, segments)
      setExportJobId(res.job_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export selhal')
      setExporting(false)
    }
  }

  const progress = status?.progress ?? 0
  const isExporting = exporting || (status?.status === 'exporting')

  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <p className="text-zinc-400 text-xs uppercase tracking-wider mb-3">Export</p>

      <div className="flex items-center gap-3 flex-wrap">
        {!isReady ? (
          <button
            onClick={handleExport}
            disabled={isExporting || keepCount === 0}
            className={`
              px-5 py-2.5 rounded-lg font-medium text-sm transition-all
              ${isExporting || keepCount === 0
                ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
              }
            `}
          >
            {isExporting ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Exportuji…
              </span>
            ) : (
              `Exportovat video (${keepCount} segmentů)`
            )}
          </button>
        ) : (
          <a
            href={api.downloadUrl(jobId)}
            download
            className="px-5 py-2.5 rounded-lg font-medium text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Stáhnout video
          </a>
        )}

        {isExporting && (
          <div className="flex-1 min-w-[160px]">
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-zinc-500 text-xs mt-1">{status?.message ?? 'Zpracovávám…'}</p>
          </div>
        )}
      </div>

      {keepCount === 0 && !isExporting && (
        <p className="text-yellow-400 text-xs mt-2">Nejsou žádné segmenty k ponechání. Použijte tlačítko Invertovat.</p>
      )}

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  )
}
