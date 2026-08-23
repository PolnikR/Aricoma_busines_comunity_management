import { useEffect, useState } from 'react'
import type { Role } from '../models/identityTypes'
import { mockRoles } from '../services/mockIdentityService'

interface UseRolesOptions {
  organizationId?: string
}

export function useRoles(options?: UseRolesOptions) {
  const [data, setData] = useState<Role[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        let filtered = [...mockRoles]
        if (options?.organizationId) {
          filtered = filtered.filter(r => r.organizationId === options.organizationId)
        }
        setData(filtered)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load roles'))
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
