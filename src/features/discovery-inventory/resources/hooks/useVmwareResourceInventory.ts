import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { discoveryInventoryKeys } from '../api/resourceInventoryQueryKeys'
import {
  fetchVmwareInventory,
  normalizeVmwareInventorySearch,
  type VmwareInventorySearch,
} from '../api/vmwareInventoryApi'
import type { DiscoveryInventory } from '../model/discoveryTypes'

const NAME_SEARCH_DEBOUNCE_MS = 300

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
