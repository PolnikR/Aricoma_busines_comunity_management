import { useEffect, useState } from 'react'
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
}

function isCurrentQueryKey(
  left: readonly unknown[],
  right: readonly unknown[],
) {
  return left.length === right.length && left.every((value, index) => value === right[index])
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
  const [forceRefreshSnapshot, setForceRefreshSnapshot] = useState<ForceRefreshSnapshot | null>(null)

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

  const forceRefreshMutation = useMutation<DiscoveryInventory, Error, ForceRefreshSnapshot>({
    mutationFn: ({ search: snapshotSearch }) => fetchVmwareInventory({ ...snapshotSearch, forceRefresh: true }),
    onSuccess: (data, { queryKey: snapshotQueryKey }) => {
      queryClient.setQueryData(snapshotQueryKey, data)
    },
  })
  const forceRefresh = () => {
    const snapshot = { search, queryKey }
    setForceRefreshSnapshot(snapshot)
    return forceRefreshMutation.mutateAsync(snapshot)
  }
  const isCurrentForceRefresh = forceRefreshSnapshot !== null
    && isCurrentQueryKey(forceRefreshSnapshot.queryKey, queryKey)

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
    isForceRefreshing: forceRefreshMutation.isPending && isCurrentForceRefresh,
    forceRefreshError: isCurrentForceRefresh ? forceRefreshMutation.error ?? null : null,
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
