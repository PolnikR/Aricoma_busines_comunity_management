import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getGetRecoveryGroupInventoryQueryKey, getRecoveryGroupInventory } from '@/generated/query/recovery-groups/recovery-groups.gen'

// A live attempt writes the validated wire response to the ordinary query. The
// ordinary queryFn stays unchanged, including its focus/reconnect/retry behavior.
export function useRefreshRecoveryGroupInventory(runId: string | null) {
  const client = useQueryClient()
  const operation = useRef<{ cancel: () => void } | null>(null)
  const [state, setState] = useState<{ runId: string; pending: boolean; error: unknown } | null>(null)

  useEffect(() => () => {
    operation.current?.cancel()
    setState(null)
  }, [client, runId])

  const refresh = async () => {
    if (!runId || operation.current) return
    const queryKey = getGetRecoveryGroupInventoryQueryKey({ run_id: runId })
    const cache = client.getQueryCache()
    const query = cache.find({ queryKey, exact: true })
    if (!query) return
    const controller = new AbortController()
    let unsubscribe: () => void = () => undefined
    const current = {
      cancel: () => {
        controller.abort()
        unsubscribe()
        if (operation.current === current) {
          operation.current = null
          setState(null)
        }
      },
    }
    operation.current = current
    setState({ runId, pending: true, error: null })
    const isCurrent = () => operation.current === current
      && cache.find({ queryKey, exact: true }) === query
    // Rollback/delete invalidate the existing query, rather than always removing
    // it. Their result must take precedence over this earlier live attempt.
    unsubscribe = cache.subscribe(event => {
      if (event.query === query && (event.type === 'removed'
        || event.type === 'updated' && event.action.type === 'invalidate')) current.cancel()
    })
    try {
      await client.cancelQueries({ queryKey, exact: true })
      if (!isCurrent()) return
      const response = await getRecoveryGroupInventory({ run_id: runId, force_refresh: true }, { signal: controller.signal })
      if (!isCurrent()) return
      if (response.run_id !== runId) throw new Error('Inventory response belongs to another run')
      // A normal GET may have started while the live request was pending.
      await client.cancelQueries({ queryKey, exact: true })
      if (!isCurrent()) return
      client.setQueryData(queryKey, response)
      const providerId = response.snapshot_provider_id
      if (providerId) {
        void client.invalidateQueries({
          predicate: ({ queryKey: [endpoint, params] }) => (endpoint === '/get_volumes' || endpoint === '/get_volume_tree')
            && typeof params === 'object' && params !== null && 'provider_id' in params && params.provider_id === providerId,
          refetchType: 'none',
        })
      }
      setState({ runId, pending: false, error: null })
    } catch (error) {
      if (isCurrent()) setState({ runId, pending: false, error })
    } finally {
      unsubscribe()
      if (operation.current === current) operation.current = null
    }
  }

  return {
    refresh,
    isRefreshing: state?.runId === runId && state.pending,
    error: state?.runId === runId ? state.error : null,
    clearError: () => { setState(null) },
  }
}
