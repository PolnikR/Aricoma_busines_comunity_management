import { useEffect, useState } from 'react'
import type { Permission } from '../models/identityTypes'
import { mockPermissions } from '../services/mockIdentityService'

interface usePermissionsOptions {
  category?: Permission['category']
}

export function usePermissions(options?: usePermissionsOptions) {
  const [data, setData] = useState<Permission[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        let filtered = [...mockPermissions]
        if (options?.category) {
          filtered = filtered.filter(p => p.category === options.category)
        }
        setData(filtered)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load permissions'))
      } finally {
        setIsLoading(false)
      }
    }, 200)

    return () => { clearTimeout(timer); }
  }, [options?.category])

  return { data, isLoading, error }
}
