import { useRef, useState, DragEvent } from 'react'

interface Props {
  onFile: (file: File) => void
  uploading: boolean
  error: string | null
}

const ACCEPTED = ['video/mp4', 'video/quicktime', 'video/x-msvideo']

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function UploadZone({ onFile, uploading, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<File | null>(null)

  const handleFile = (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      return
    }
    setSelected(file)
    onFile(file)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const onDragLeave = () => setDragging(false)

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div
        className={`
          w-full max-w-2xl border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer
          transition-all duration-200
          ${dragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-zinc-600 hover:border-zinc-400 bg-zinc-900/50 hover:bg-zinc-800/50'
          }
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />

        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center">
            <svg className="w-10 h-10 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>

          {selected ? (
            <div>
              <p className="text-white font-medium text-lg">{selected.name}</p>
              <p className="text-zinc-400 text-sm mt-1">{formatBytes(selected.size)}</p>
            </div>
          ) : (
            <div>
              <p className="text-white font-medium text-xl">
                {dragging ? 'Pusťte video zde' : 'Přetáhněte video nebo klikněte'}
              </p>
              <p className="text-zinc-400 text-sm mt-2">MP4, MOV, AVI · max 500 MB</p>
            </div>
          )}

          {uploading && (
            <div className="flex items-center gap-2 text-blue-400">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Nahrávám…</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 text-red-400 text-sm">{error}</p>
      )}
    </div>
  )
}
