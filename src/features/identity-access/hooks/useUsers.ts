import { useEffect, useState } from 'react'
import type { User } from '../models/identityTypes'
import { mockUsers } from '../services/mockIdentityService'

interface UseUsersOptions {
  organizationId?: string
}

export function useUsers(options?: UseUsersOptions) {
  const [data, setData] = useState<User[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        let filtered = [...mockUsers]
        if (options?.organizationId) {
          filtered = filtered.filter(u => u.organizationId === options.organizationId)
        }
        setData(filtered)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load users'))
      } finally {
        setIsLoading(false)
      }
    }, 200)

    return () => { clearTimeout(timer) }
  }, [options?.organizationId, requestVersion])

  const refetch = () => {
    setIsLoading(true)
    setRequestVersion(current => current + 1)
  }

  return { data, isLoading, error, refetch }
}
