import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ProviderRecord, ProviderRole, ProviderType } from '@/features/providers-connectors/providers/model/providerTypes'
import { getProvidersByTypeAndRole } from '@/features/providers-connectors/providers/utils/providerFilters'
import type { PowerVmsResponse, VolumesResponse } from '@/generated/query/zod'
import {
  createFlashSystemInventorySelect,
  createPowerInventorySelect,
  flashSystemInventoryQuery,
  powerInventoryQuery,
} from '../model/inventoryQueries'
import type {
  FlashSystemInventory,
  FlashSystemVolumeResource,
  PowerInventory,
  PowerPartitionResource,
} from '../model/discoveryTypes'
import { isPowerInventory, isFlashSystemInventory } from '../helpers/inventoryTypeGuards'

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
  providerId?: string,
  role: ProviderRole = 'source',
): ResourceInventoryQueriesResult {
  const providerType = activeTab ? providerTypeByTab[activeTab] : null
  const matchingProviders = useMemo(
    () => providerType ? getProvidersByTypeAndRole(providers, providerType, role) : [],
    [providerType, providers, role],
  )
  const selectedProvider = matchingProviders.find((provider) => provider.id === providerId)
  const effectiveProviderId = selectedProvider?.id

  // FlashSystem and IBM Power inventories come from different endpoints, so the
  // response type is narrowed per provider type.
  const definition = useMemo(() => {
    if (providerType === 'FLASHCOPY') {
      const select = createFlashSystemInventorySelect(effectiveProviderId)
      return {
        ...flashSystemInventoryQuery(effectiveProviderId),
        select: (response: unknown): FlashSystemInventory | PowerInventory => select(response as VolumesResponse),
      }
    }
    const select = createPowerInventorySelect(effectiveProviderId)
    return {
      ...powerInventoryQuery(effectiveProviderId),
      select: (response: unknown): FlashSystemInventory | PowerInventory => select(response as PowerVmsResponse),
    }
  }, [effectiveProviderId, providerType])

  const query = useQuery<unknown, Error, FlashSystemInventory | PowerInventory>({
    ...definition,
    enabled: providerType !== null && matchingProviders.length > 0,
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
