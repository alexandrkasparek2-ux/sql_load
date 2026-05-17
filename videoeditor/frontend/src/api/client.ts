import type { JobStatus, UploadResponse, Segment } from '../types/api'

// In production point to Railway backend via VITE_API_URL, locally use Vite proxy
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}`
  : '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  upload: (file: File): Promise<UploadResponse> => {
    const body = new FormData()
    body.append('file', file)
    return request('/upload', { method: 'POST', body })
  },

  analyze: (jobId: string): Promise<{ job_id: string }> =>
    request(`/analyze/${jobId}`, { method: 'POST' }),

  status: (jobId: string): Promise<JobStatus> =>
    request(`/status/${jobId}`),

  export: (jobId: string, segments: Segment[]): Promise<{ job_id: string }> =>
    request(`/export/${jobId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(segments),
    }),

  downloadUrl: (jobId: string): string => `${BASE}/download/${jobId}`,
}
