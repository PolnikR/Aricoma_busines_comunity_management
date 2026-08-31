import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { discoveryInventoryKeys } from '../api/resourceInventoryQueryKeys'
import {
  fetchVmwareInventory,
  normalizeVmwareInventorySearch,
  type VmwareInventorySearch,
} from '../api/vmwareInventoryApi'
import type { DiscoveryInventory } from '../model/discoveryTypes'

const NAME_SEARCH_DEBOUNCE_MS = 300

interface ForceRefreshSnapshot {
  search: VmwareInventorySearch
  queryKey: ReturnType<typeof discoveryInventoryKeys.vmwareSearch>
  queryHash: string
  requestId: number
}

interface ForceRefreshState {
  latestRequestId: number
  pendingRequestIds: number[]
  error: Error | null
}

export interface VmwareResourceInventoryOptions {
  providerId?: string
  folderName?: string
  namePrefix?: string
  tag?: string
  enabled?: boolean
}

export function useVmwareResourceInventory({
  providerId,
  folderName,
  namePrefix,
  tag,
  enabled = true,
}: VmwareResourceInventoryOptions = {}) {
  const queryClient = useQueryClient()
  const normalizedSearch = normalizeVmwareInventorySearch({
    ...(providerId !== undefined ? { providerId } : {}),
    ...(folderName !== undefined ? { folderName } : {}),
    ...(namePrefix !== undefined ? { namePrefix } : {}),
    ...(tag !== undefined ? { tag } : {}),
  })
  const normalizedNamePrefix = normalizedSearch.namePrefix
  const hasNamePrefix = normalizedNamePrefix !== undefined
  const [debouncedNamePrefix, setDebouncedNamePrefix] = useState('')
  const [settledProviderId, setSettledProviderId] = useState<string | undefined>()
  const [forceRefreshStates, setForceRefreshStates] = useState<Record<string, ForceRefreshState>>({})
  const forceRefreshRequestId = useRef(0)
  const latestForceRefreshRequestIds = useRef<Record<string, number>>({})

  useEffect(() => {
    const timeout = setTimeout(
      () => { setDebouncedNamePrefix(normalizedNamePrefix ?? '') },
      hasNamePrefix ? NAME_SEARCH_DEBOUNCE_MS : 0,
    )
    return () => { clearTimeout(timeout) }
  }, [hasNamePrefix, normalizedNamePrefix])

  const search: VmwareInventorySearch = {
    ...(normalizedSearch.providerId ? { providerId: normalizedSearch.providerId } : {}),
    ...(normalizedSearch.folderName ? { folderName: normalizedSearch.folderName } : {}),
    ...(normalizedSearch.tag ? { tag: normalizedSearch.tag } : {}),
    ...(debouncedNamePrefix ? { namePrefix: debouncedNamePrefix } : {}),
  }
  const queryKey = discoveryInventoryKeys.vmwareSearch(search)
  const queryHash = JSON.stringify(queryKey)
  const canFetch = enabled && Boolean(normalizedSearch.providerId)
    && (!hasNamePrefix || debouncedNamePrefix === normalizedNamePrefix)

  const query = useQuery<DiscoveryInventory>({
    queryKey,
    queryFn: () => fetchVmwareInventory(search),
    enabled: canFetch,
    placeholderData: (previousData, previousQuery) => {
      const previousKey = previousQuery?.queryKey
      const previousProviderId = previousKey?.[1] === 'vmware-search' ? previousKey[2] : undefined
      return previousProviderId === normalizedSearch.providerId ? previousData : undefined
    },
  })

  const settleForceRefresh = (snapshot: ForceRefreshSnapshot, error: Error | null) => {
    setForceRefreshStates((states) => {
      const state = states[snapshot.queryHash]
      if (!state) return states

      const pendingRequestIds = state.pendingRequestIds.filter((requestId) => requestId !== snapshot.requestId)
      const nextState = {
        ...state,
        pendingRequestIds,
        error: state.latestRequestId === snapshot.requestId ? error : state.error,
      }

      if (pendingRequestIds.length > 0 || nextState.error !== null) {
        return { ...states, [snapshot.queryHash]: nextState }
      }

      return Object.fromEntries(
        Object.entries(states).filter(([queryHash]) => queryHash !== snapshot.queryHash),
      )
    })
  }
  const forceRefreshMutation = useMutation<DiscoveryInventory, Error, ForceRefreshSnapshot>({
    mutationFn: ({ search: snapshotSearch }) => fetchVmwareInventory({ ...snapshotSearch, forceRefresh: true }),
    onSuccess: (data, snapshot) => {
      if (latestForceRefreshRequestIds.current[snapshot.queryHash] !== snapshot.requestId) return
      queryClient.setQueryData(snapshot.queryKey, data)
    },
    onSettled: (_, error, snapshot) => {
      settleForceRefresh(snapshot, error)
    },
  })
  const forceRefresh = () => {
    const snapshot = {
      search,
      queryKey,
      queryHash,
      requestId: forceRefreshRequestId.current + 1,
    }
    forceRefreshRequestId.current = snapshot.requestId
    latestForceRefreshRequestIds.current[queryHash] = snapshot.requestId
    setForceRefreshStates((states) => {
      const previousState = states[queryHash]
      return {
        ...states,
        [queryHash]: {
          latestRequestId: snapshot.requestId,
          pendingRequestIds: [...(previousState?.pendingRequestIds ?? []), snapshot.requestId],
          error: null,
        },
      }
    })
    return forceRefreshMutation.mutateAsync(snapshot)
  }
  const forceRefreshState = forceRefreshStates[queryHash]

  const isDebouncing = hasNamePrefix && debouncedNamePrefix !== normalizedNamePrefix
  const hasSettledProviderQuery = settledProviderId === normalizedSearch.providerId

  useEffect(() => {
    if (!canFetch || query.isPending) return

    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setSettledProviderId(normalizedSearch.providerId)
    })

    return () => { cancelled = true }
  }, [canFetch, normalizedSearch.providerId, query.isPending])

  return {
    ...query,
    forceRefresh,
    isForceRefreshing: Boolean(forceRefreshState?.pendingRequestIds.length),
    forceRefreshError: forceRefreshState?.error ?? null,
    isDebouncing,
    isInitialLoading: canFetch && query.isPending && !isDebouncing && !hasSettledProviderQuery,
    isBackgroundFetching: query.isFetching && Boolean(query.data),
    error: isDebouncing ? null : query.error,
    isError: query.isError && !isDebouncing,
    isEmpty: query.isSuccess
      && !query.isPlaceholderData
      && !query.isFetching
      && !isDebouncing
      && query.data.virtualMachines.length === 0,
  }
}
