import { useMemo } from 'react'
import { useSearchParams } from 'react-router'

export const RESOURCE_INVENTORY_PAGE_SIZES = [10, 25, 50] as const
export type ResourceInventoryPageSize = (typeof RESOURCE_INVENTORY_PAGE_SIZES)[number]

export interface ResourceInventoryQuery {
  page: number
  pageSize: ResourceInventoryPageSize
  search: string
}

export type ResourceInventoryParamValue =
  | string
  | number
  | boolean
  | readonly string[]
  | null
  | undefined

export interface ResourceInventorySearchParamsOptions<TFilters extends object> {
  parseFilters: (searchParams: URLSearchParams) => TFilters
}

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parsePageSize(value: string | null): ResourceInventoryPageSize {
  const parsed = Number(value)
  return RESOURCE_INVENTORY_PAGE_SIZES.includes(parsed as ResourceInventoryPageSize)
    ? parsed as ResourceInventoryPageSize
    : 10
}

function normalizeValue(value: ResourceInventoryParamValue) {
  if (Array.isArray(value)) return value.join(',')
  if (typeof value === 'boolean') return value ? 'true' : ''
  if (value === null || value === undefined) return ''
  return String(value)
}

export function useResourceInventorySearchParams<TFilters extends object = Record<string, never>>(
  options?: ResourceInventorySearchParamsOptions<TFilters>,
) {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo<ResourceInventoryQuery & TFilters>(() => ({
    page: parsePositiveInteger(searchParams.get('page'), 1),
    pageSize: parsePageSize(searchParams.get('pageSize')),
    search: searchParams.get('search') ?? '',
    ...(options?.parseFilters ? options.parseFilters(searchParams) : {} as TFilters),
  }), [options, searchParams])

  const updateQuery = (
    changes: object,
    resetPage = false,
  ) => {
    const next = new URLSearchParams(searchParams)
    const changeValues = changes as Record<string, ResourceInventoryParamValue>
    const values: Record<string, ResourceInventoryParamValue> = {
      ...changeValues,
      page: resetPage ? 1 : changeValues['page'] ?? query.page,
      pageSize: changeValues['pageSize'] ?? query.pageSize,
    }

    Object.entries(values).forEach(([key, value]) => {
      let normalized = normalizeValue(value)
      if (key === 'page') normalized = String(parsePositiveInteger(normalized, 1))
      if (key === 'pageSize') normalized = String(parsePageSize(normalized))
      if (!normalized) next.delete(key)
      else next.set(key, normalized)
    })

    setSearchParams(next, { replace: true })
  }

  return { query, updateQuery }
}
