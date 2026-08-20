import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  DISCOVERY_INVENTORY_GC_TIME_MS,
  DISCOVERY_INVENTORY_STALE_TIME_MS,
  discoveryInventoryKeys,
} from '../api/resourceInventoryQueryKeys'
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
    staleTime: DISCOVERY_INVENTORY_STALE_TIME_MS,
    gcTime: DISCOVERY_INVENTORY_GC_TIME_MS,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    select: (inventory) => hasTag && hasNamePrefix
      ? {
          ...inventory,
          virtualMachines: inventory.virtualMachines.filter((vm) => vm.name.startsWith(namePrefix)),
        }
      : inventory,
  })

  const isDebouncing = isNameOnly && debouncedNamePrefix !== namePrefix

  return {
    ...query,
    isDebouncing,
    isInitialLoading: canFetch && query.isPending && !isDebouncing,
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
