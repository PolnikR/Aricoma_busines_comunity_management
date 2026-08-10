import { useResourceInventorySearchParams } from './useResourceInventorySearchParams'
import type { PowerFilters } from '../model/sourceInventoryTypes'

type PowerUrlFilters = Omit<PowerFilters, 'search'>

export function usePowerSearchParams() {
  const { query, updateQuery } = useResourceInventorySearchParams<PowerUrlFilters>({
    parseFilters: (searchParams) => ({
      partitionKind: searchParams.get('partitionKind') ?? '',
      partitionState: searchParams.get('partitionState') ?? '',
      operatingSystemType: searchParams.get('operatingSystemType') ?? '',
      volumeState: searchParams.get('volumeState') ?? '',
    }),
  })

  const updateFilters = (filters: Partial<PowerFilters>) => {
    updateQuery(filters, true)
  }

  return { query, updateQuery, updateFilters }
}
