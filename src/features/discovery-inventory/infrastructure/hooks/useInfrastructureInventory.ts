import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { PowerVmsResponse, VmsResponse } from '@/generated/query/zod'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import {
  createPowerInventorySelect,
  powerInventoryQuery,
  selectVmwareInventory,
  vmwareInventoryQuery,
} from '../../resources/model/inventoryQueries'
import type { DiscoveryInventory, PowerInventory } from '../../resources/model/discoveryTypes'

export type InfrastructureInventory = DiscoveryInventory | PowerInventory

export function useInfrastructureInventory(provider: ProviderRecord | null) {
  const providerType = provider?.type
  const providerId = provider?.id
  // One query per provider type: the power and VMware inventories come from
  // different endpoints, so the response type is narrowed per branch.
  const options = useMemo(() => {
    if (providerType === 'IBM_POWER') {
      const select = createPowerInventorySelect(providerId)
      return { ...powerInventoryQuery(providerId), select: (data: unknown): InfrastructureInventory => select(data as PowerVmsResponse) }
    }
    if (providerType === 'VMWARE') {
      return { ...vmwareInventoryQuery({ ...(providerId ? { providerId } : {}) }), select: (data: unknown): InfrastructureInventory => selectVmwareInventory(data as VmsResponse) }
    }
    return null
  }, [providerId, providerType])

  return useQuery<unknown, Error, InfrastructureInventory>({
    queryKey: options?.queryKey ?? ['infrastructure-topology', 'inactive'],
    queryFn: options?.queryFn ?? (() => Promise.reject(new Error('A supported infrastructure provider is required.'))),
    ...(options ? { select: options.select } : {}),
    enabled: options !== null,
  })
}
