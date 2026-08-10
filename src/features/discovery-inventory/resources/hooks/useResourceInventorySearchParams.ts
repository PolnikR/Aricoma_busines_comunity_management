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

export function useResourceInventorySearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo<ResourceInventoryQuery>(() => ({
    page: parsePositiveInteger(searchParams.get('page'), 1),
    pageSize: parsePageSize(searchParams.get('pageSize')),
    search: searchParams.get('search') ?? '',
  }), [searchParams])

  const updateQuery = (
    changes: Record<string, ResourceInventoryParamValue>,
    resetPage = false,
  ) => {
    const next = new URLSearchParams(searchParams)
    const values = resetPage ? { ...changes, page: 1 } : changes

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
