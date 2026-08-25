import { useCallback, useEffect, useState } from 'react'
import type { IdentityAdminPreview } from '../services/identityAdminGateway'
import { useIdentityAdminGateway } from './useIdentityAdminGateway'

function toMutationError(cause: unknown) {
  return cause instanceof Error
    ? cause
    : new Error('Identity administration operation could not be completed')
}

export function useIdentityAdminPreview() {
  const gateway = useIdentityAdminGateway()
  const [data, setData] = useState<IdentityAdminPreview | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isMutating, setIsMutating] = useState(false)
  const [mutationError, setMutationError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setData(await gateway.getPreview())
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error('Identity administration preview could not be loaded'))
    }
  }, [gateway])

  useEffect(() => {
    let isActive = true
    void gateway.getPreview().then(
      preview => {
        if (isActive) {
          setData(preview)
          setError(null)
        }
      },
      (cause: unknown) => {
        if (isActive) setError(cause instanceof Error ? cause : new Error('Identity administration preview could not be loaded'))
      },
    )
    return () => { isActive = false }
  }, [gateway])

  const mutate = useCallback(async (operation: () => Promise<unknown>) => {
    setIsMutating(true)
    setMutationError(null)

    try {
      await operation()
      await refresh()
      return true
    } catch (cause) {
      setMutationError(toMutationError(cause))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [refresh])

  const clearMutationError = useCallback(() => {
    setMutationError(null)
  }, [])

  return {
    data,
    error,
    isLoading: data === null && error === null,
    isMutating,
    mutationError,
    clearMutationError,
    refresh,
    mutate,
    gateway,
  }
}
