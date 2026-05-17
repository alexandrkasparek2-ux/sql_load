import { useState, useEffect, useRef } from 'react'
import type { JobStatus } from '../types/api'
import { api } from '../api/client'

export function useJob(jobId: string | null) {
  const [status, setStatus] = useState<JobStatus | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!jobId) return

    const poll = async () => {
      try {
        const data = await api.status(jobId)
        setStatus(data)
        if (data.status === 'done' || data.status === 'error') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      } catch (err) {
        console.error('Status poll error:', err)
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 2000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [jobId])

  return status
}
