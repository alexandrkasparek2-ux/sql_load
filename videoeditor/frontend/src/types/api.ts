export interface Segment {
  id: string
  start: number
  end: number
  duration: number
  action: 'keep' | 'cut'
  reason: string
  score: number
  issues: string[]
}

export interface JobStatus {
  job_id: string
  status: 'pending' | 'analyzing' | 'exporting' | 'done' | 'error'
  progress: number
  message: string
  segments: Segment[]
  error?: string
  download_url?: string
}

export interface UploadResponse {
  job_id: string
  filename: string
}
