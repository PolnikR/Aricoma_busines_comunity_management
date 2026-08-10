import { useResourceInventorySearchParams } from './useResourceInventorySearchParams'
import type { VirtualMachineFilters } from '../types'

type VirtualMachineUrlFilters = Omit<VirtualMachineFilters, 'search'>

function parseTags(value: string | null): string[] {
  if (!value) return []
  return value.split(',').filter(Boolean)
}

function parseBoolean(value: string | null): boolean {
  return value === 'true'
}


export function useVirtualMachineSearchParams() {
  const { query, updateQuery } = useResourceInventorySearchParams<VirtualMachineUrlFilters>({
    parseFilters: (searchParams) => {
    const providerIdValue = searchParams.get('providerId')
    return {
      powerState: searchParams.get('powerState') ?? '',
      connectionState: searchParams.get('connectionState') ?? '',
      cluster: searchParams.get('cluster') ?? '',
      providerId: providerIdValue && providerIdValue !== 'null' ? providerIdValue : null,
      tags: parseTags(searchParams.get('tags')),
      untagged: parseBoolean(searchParams.get('untagged')),
    }
    },
  })

  const updateFilters = (filters: VirtualMachineFilters) => { updateQuery(filters, true) }

  return { query, updateQuery, updateFilters }
}
