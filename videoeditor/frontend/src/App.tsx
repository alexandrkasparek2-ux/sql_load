import { useState, useRef, useCallback, useEffect } from 'react'
import type { Segment } from './types/api'
import { useUpload } from './hooks/useUpload'
import { useJob } from './hooks/useJob'
import { UploadZone } from './components/UploadZone'
import { VideoPlayer } from './components/VideoPlayer'
import { Timeline } from './components/Timeline'
import { SegmentList } from './components/SegmentList'
import { ExportPanel } from './components/ExportPanel'

type AppState = 'idle' | 'analyzing' | 'done'

export default function App() {
  const { upload, uploading, error: uploadError, jobId } = useUpload()
  const jobStatus = useJob(jobId)

  const [localSegments, setLocalSegments] = useState<Segment[] | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [seekTo, setSeekTo] = useState<number | null>(null)
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null)
  const currentTimeRef = useRef(0)

  const segments = localSegments ?? jobStatus?.segments ?? []

  const appState: AppState = !jobId
    ? 'idle'
    : jobStatus?.status === 'done' && segments.length > 0
    ? 'done'
    : 'analyzing'

  const handleFile = useCallback(async (file: File) => {
    setLocalSegments(null)
    if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl)
    const url = URL.createObjectURL(file)
    setVideoObjectUrl(url)
    await upload(file)
  }, [upload, videoObjectUrl])

  const handleToggle = (id: string) => {
    setLocalSegments(
      segments.map((s) =>
        s.id === id ? { ...s, action: s.action === 'keep' ? 'cut' : 'keep' } : s
      )
    )
  }

  const handleSeek = (t: number) => {
    setSeekTo(t)
    setTimeout(() => setSeekTo(null), 100)
  }

  // Sync local segments when job analysis finishes
  useEffect(() => {
    if (jobStatus?.status === 'done' && localSegments === null && jobStatus.segments.length > 0) {
      setLocalSegments(jobStatus.segments)
    }
  }, [jobStatus?.status, jobStatus?.segments, localSegments])

  const videoSrc = videoObjectUrl ?? ''

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-semibold text-base leading-none">AI Video Editor</h1>
            <p className="text-zinc-500 text-xs mt-0.5">Automatický střih pomocí AI</p>
          </div>
          {jobId && (
            <button
              onClick={() => window.location.reload()}
              className="ml-auto text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Nové video
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {appState === 'idle' && (
          <UploadZone onFile={handleFile} uploading={uploading} error={uploadError} />
        )}

        {appState === 'analyzing' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>

            <div className="text-center max-w-sm">
              <p className="text-white font-medium text-lg">
                {jobStatus?.message ?? 'Analyzuji záběry…'}
              </p>
              {jobStatus?.status === 'error' && (
                <p className="text-red-400 text-sm mt-2">{jobStatus.error}</p>
              )}
            </div>

            {jobStatus && (
              <div className="w-full max-w-sm">
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${jobStatus.progress}%` }}
                  />
                </div>
                <p className="text-zinc-500 text-xs text-center mt-2">{jobStatus.progress}%</p>
              </div>
            )}
          </div>
        )}

        {appState === 'done' && jobId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <VideoPlayer
                src={videoSrc}
                currentTimeRef={currentTimeRef}
                onTimeUpdate={setCurrentTime}
                seekTo={seekTo}
              />
              <Timeline segments={segments} currentTime={currentTime} onSeek={handleSeek} />
              <ExportPanel jobId={jobId} segments={segments} />
            </div>

            <div className="lg:col-span-1">
              <SegmentList segments={segments} onToggle={handleToggle} onSeek={handleSeek} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
