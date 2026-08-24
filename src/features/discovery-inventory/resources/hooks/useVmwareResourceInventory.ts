import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { discoveryInventoryKeys } from '../api/resourceInventoryQueryKeys'
import { fetchVmwareInventory } from '../api/vmwareInventoryApi'
import { fetchVmsByName } from '../api/vmsByNameApi'
import { mapVmwareInventory } from '../helpers/mapVmwareInventory'
import type { DiscoveryInventory } from '../model/discoveryTypes'

const NAME_SEARCH_DEBOUNCE_MS = 300

export function useVmwareResourceInventory(
  providerId?: string,
  namePrefix = '',
  tag = '',
  enabled = true,
) {
  const hasNamePrefix = Boolean(namePrefix)
  const hasTag = Boolean(tag)
  const isNameOnly = hasNamePrefix && !hasTag
  const [debouncedNamePrefix, setDebouncedNamePrefix] = useState('')
  const [settledProviderId, setSettledProviderId] = useState<string | undefined>()

  useEffect(() => {
    const timeout = setTimeout(
      () => { setDebouncedNamePrefix(isNameOnly ? namePrefix : '') },
      isNameOnly ? NAME_SEARCH_DEBOUNCE_MS : 0,
    )
    return () => { clearTimeout(timeout) }
  }, [isNameOnly, namePrefix])

  const queryKey = isNameOnly
    ? discoveryInventoryKeys.vmsByName(debouncedNamePrefix, providerId)
    : discoveryInventoryKeys.inventory(providerId, hasTag ? tag : undefined)
  const canFetch = enabled && Boolean(providerId) && (!isNameOnly || debouncedNamePrefix === namePrefix)

  const query = useQuery<DiscoveryInventory>({
    queryKey,
    queryFn: async () => {
      if (isNameOnly) {
        const response = await fetchVmsByName({
          prefix: debouncedNamePrefix,
          ...(providerId !== undefined ? { providerId } : {}),
        })
        return mapVmwareInventory(response)
      }

      return fetchVmwareInventory(providerId, hasTag ? tag : undefined)
    },
    enabled: canFetch,
    placeholderData: (previousData, previousQuery) => {
      const previousKey = previousQuery?.queryKey
      const previousProviderId = previousKey?.[1] === 'inventory'
        ? previousKey[2]
        : previousKey?.[1] === 'vms-by-name'
          ? previousKey[3]
          : undefined
      return previousProviderId === providerId ? previousData : undefined
    },
    select: (inventory) => hasTag && hasNamePrefix
      ? {
          ...inventory,
          virtualMachines: inventory.virtualMachines.filter((vm) => vm.name.startsWith(namePrefix)),
        }
      : inventory,
  })

  const isDebouncing = isNameOnly && debouncedNamePrefix !== namePrefix
  const hasSettledProviderQuery = settledProviderId === providerId

  useEffect(() => {
    if (!canFetch || query.isPending) return

    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setSettledProviderId(providerId)
    })

    return () => { cancelled = true }
  }, [canFetch, providerId, query.isPending])

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
