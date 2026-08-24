import { useEffect, useState } from 'react'
import type { Session } from '../models/identityTypes'
import { mockSessions } from '../services/mockIdentityService'

interface useSessionsOptions {
  userId?: string
  organizationId?: string
}

export function useSessions(options?: useSessionsOptions) {
  const [data, setData] = useState<Session[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        let filtered = [...mockSessions]
        if (options?.userId) {
          filtered = filtered.filter(s => s.userId === options.userId)
        }
        if (options?.organizationId) {
          filtered = filtered.filter(s => s.organizationId === options.organizationId)
        }
        setData(filtered)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load sessions'))
      } finally {
        setIsLoading(false)
      }
    }, 200)

    return () => { clearTimeout(timer) }
  }, [options?.userId, options?.organizationId, requestVersion])

  const refetch = () => {
    setIsLoading(true)
    setRequestVersion(current => current + 1)
  }

  return { data, isLoading, error, refetch }
}
