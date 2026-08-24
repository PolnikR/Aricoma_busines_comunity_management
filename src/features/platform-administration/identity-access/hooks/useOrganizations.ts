import { useEffect, useState } from 'react'
import type { Organization } from '../models/identityTypes'
import { mockOrganizations } from '../services/mockIdentityService'

export function useOrganizations() {
  const [data, setData] = useState<Organization[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setData([...mockOrganizations])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load organizations'))
      } finally {
        setIsLoading(false)
      }
    }, 200)

    return () => { clearTimeout(timer) }
  }, [requestVersion])

  const refetch = () => {
    setIsLoading(true)
    setRequestVersion(current => current + 1)
  }

  return { data, isLoading, error, refetch }
}
