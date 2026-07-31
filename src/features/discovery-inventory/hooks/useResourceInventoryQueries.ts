import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
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

function isFlashSystemInventory(
  inventory: FlashSystemInventory | PowerInventory,
): inventory is FlashSystemInventory {
  return 'resources' in inventory
}

function isPowerInventory(
  inventory: FlashSystemInventory | PowerInventory,
): inventory is PowerInventory {
  return 'partitions' in inventory
}

export function useResourceInventoryQueries(
  activeTab: NonVmwareResourceTab | null,
  providers: ProviderRecord[],
  providerId?: string,
): ResourceInventoryQueriesResult {
  const providerType = activeTab ? providerTypeByTab[activeTab] : null
  const matchingProviders = useMemo(
    () => providerType ? providers.filter((provider) => provider.type === providerType) : [],
    [providerType, providers],
  )
  const selectedProvider = matchingProviders.find((provider) => provider.id === providerId)
  const effectiveProviderId = selectedProvider?.id

  const query = useQuery<FlashSystemInventory | PowerInventory>({
    queryKey: discoveryInventoryKeys.resourceInventory(providerType ?? 'inactive', effectiveProviderId),
    queryFn: async () => providerType === 'FLASHCOPY'
      ? fetchFlashSystemInventory(effectiveProviderId)
      : fetchPowerInventory(effectiveProviderId),
    enabled: providerType !== null && matchingProviders.length > 0,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
  const queryData = query.data

  const flashSystemInventories = useMemo(
    () => {
      const provider = selectedProvider ?? matchingProviders[0]
      return provider && queryData && isFlashSystemInventory(queryData)
        ? [{ provider, inventory: queryData }]
        : []
    },
    [matchingProviders, queryData, selectedProvider],
  )

  const powerInventories = useMemo(
    () => {
      const provider = selectedProvider ?? matchingProviders[0]
      return provider && queryData && isPowerInventory(queryData)
        ? [{ provider, inventory: queryData }]
        : []
    },
    [matchingProviders, queryData, selectedProvider],
  )

  const failures = query.error
    ? (selectedProvider ? [selectedProvider] : matchingProviders).map((provider) => ({
        provider,
        error: query.error instanceof Error ? query.error : new Error(String(query.error)),
      }))
    : []

  return {
    flashSystemResources: flashSystemInventories.flatMap(({ inventory }) => inventory.resources),
    powerResources: powerInventories.flatMap(({ inventory }) => inventory.partitions),
    flashSystemInventories,
    powerInventories,
    failures,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasProviders: matchingProviders.length > 0,
    refetch: async () => {
      await query.refetch()
    },
  }
}
