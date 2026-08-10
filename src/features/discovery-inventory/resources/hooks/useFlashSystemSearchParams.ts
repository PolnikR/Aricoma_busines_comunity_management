import { useResourceInventorySearchParams } from './useResourceInventorySearchParams'
import type { FlashSystemFilters } from '../model/sourceInventoryTypes'

type FlashSystemUrlFilters = Omit<FlashSystemFilters, 'search'>

export function useFlashSystemSearchParams() {
  const { query, updateQuery } = useResourceInventorySearchParams<FlashSystemUrlFilters>({
    parseFilters: (searchParams) => ({
      poolId: searchParams.get('poolId') ?? '',
      hostId: searchParams.get('hostId') ?? '',
      status: searchParams.get('status') ?? '',
    }),
  })

  const updateFilters = (filters: Partial<FlashSystemFilters>) => {
    updateQuery(filters, true)
  }

  return { query, updateQuery, updateFilters }
}
