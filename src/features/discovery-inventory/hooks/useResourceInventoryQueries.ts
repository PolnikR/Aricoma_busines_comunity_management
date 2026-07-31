import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import type { ProviderRecord, ProviderType } from '@/features/providers-connectors/providers/model/providerTypes'
import { discoveryInventoryKeys } from '../api/discoveryInventoryQueryKeys'
import { fetchFlashSystemInventory, fetchPowerInventory } from '../api/discoveryInventoryApi'
import type {
  FlashSystemInventory,
  FlashSystemVolumeResource,
  PowerInventory,
  PowerPartitionResource,
} from '../model/discoveryTypes'

export type NonVmwareResourceTab = 'flashsystem' | 'ibm-power'

const providerTypeByTab: Record<NonVmwareResourceTab, ProviderType> = {
  flashsystem: 'FLASHCOPY',
  'ibm-power': 'IBM_POWER',
}

interface ProviderFailure {
  provider: ProviderRecord
  error: Error
}

interface ResourceInventoryQueriesResult {
  flashSystemResources: FlashSystemVolumeResource[]
  powerResources: PowerPartitionResource[]
  flashSystemInventories: { provider: ProviderRecord; inventory: FlashSystemInventory }[]
  powerInventories: { provider: ProviderRecord; inventory: PowerInventory }[]
  failures: ProviderFailure[]
  isLoading: boolean
  isFetching: boolean
  hasProviders: boolean
  refetch: () => Promise<void>
}

export function useResourceInventoryQueries(
  activeTab: NonVmwareResourceTab | null,
  providers: ProviderRecord[],
): ResourceInventoryQueriesResult {
  const providerType = activeTab ? providerTypeByTab[activeTab] : null
  const matchingProviders = useMemo(
    () => providerType ? providers.filter((provider) => provider.type === providerType) : [],
    [providerType, providers],
  )

  const queries = useQueries({
    queries: matchingProviders.map((provider) => ({
      queryKey: discoveryInventoryKeys.resourceInventory(provider.type, provider.id),
      queryFn: () => provider.type === 'FLASHCOPY'
        ? fetchFlashSystemInventory(provider.id)
        : fetchPowerInventory(provider.id),
      staleTime: 15 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    })),
  })

  const flashSystemInventories = useMemo(
    () => queries.flatMap((query, index) => {
      const inventory = query.data
      const provider = matchingProviders[index]
      return provider && inventory && 'resources' in inventory
        ? [{ provider, inventory }]
        : []
    }),
    [matchingProviders, queries],
  )

  const powerInventories = useMemo(
    () => queries.flatMap((query, index) => {
      const inventory = query.data
      const provider = matchingProviders[index]
      return provider && inventory && 'partitions' in inventory
        ? [{ provider, inventory }]
        : []
    }),
    [matchingProviders, queries],
  )

  const failures = queries.flatMap((query, index) => {
    const provider = matchingProviders[index]
    return provider && query.error
      ? [{ provider, error: query.error instanceof Error ? query.error : new Error(String(query.error)) }]
      : []
  })

  return {
    flashSystemResources: flashSystemInventories.flatMap(({ inventory }) => inventory.resources),
    powerResources: powerInventories.flatMap(({ inventory }) => inventory.partitions),
    flashSystemInventories,
    powerInventories,
    failures,
    isLoading: queries.some((query) => query.isPending),
    isFetching: queries.some((query) => query.isFetching),
    hasProviders: matchingProviders.length > 0,
    refetch: async () => {
      await Promise.all(queries.map((query) => query.refetch()))
    },
  }
}
