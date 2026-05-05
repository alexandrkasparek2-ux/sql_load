import { useState } from 'react'
import { api } from '../api/client'

interface UploadState {
  uploading: boolean
  error: string | null
  jobId: string | null
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    error: null,
    jobId: null,
  })

  const upload = async (file: File): Promise<string | null> => {
    setState({ uploading: true, error: null, jobId: null })
    try {
      const { job_id } = await api.upload(file)
      await api.analyze(job_id)
      setState({ uploading: false, error: null, jobId: job_id })
      return job_id
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload selhal'
      setState({ uploading: false, error: msg, jobId: null })
      return null
    }
  }

  return { ...state, upload }
}
