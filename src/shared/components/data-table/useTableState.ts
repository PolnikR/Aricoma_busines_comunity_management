import { useMemo, useState } from 'react'
import type { TableDensity } from './DataTable'

interface UseTableStateOptions<T> {
  searchFields: (keyof T)[]
  initialPageSize?: number
  initialDensity?: TableDensity
  predicate?: (row: T) => boolean
}

interface UseTableStateResult<T> {
  search: string
  setSearch: (value: string) => void
  page: number
  setPage: (page: number) => void
  pageSize: number
  setPageSize: (pageSize: number) => void
  density: TableDensity
  setDensity: (density: TableDensity) => void
  filtered: T[]
  pageItems: T[]
  pageCount: number
  total: number
}

// Client-side table state: search + optional predicate + pagination + density.
// Features needing URL-state should drive the controlled components directly
// instead of using this hook.
export function useTableState<T>(rows: T[], options: UseTableStateOptions<T>): UseTableStateResult<T> {
  const { searchFields, initialPageSize = 10, initialDensity = 'compact', predicate } = options

  const [search, setSearchValue] = useState('')
  const [pageSize, setPageSizeValue] = useState(initialPageSize)
  const [density, setDensity] = useState<TableDensity>(initialDensity)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (predicate && !predicate(row)) return false
      if (!term) return true
      return searchFields.some((field) => String(row[field] ?? '').toLowerCase().includes(term))
    })
  }, [rows, search, predicate, searchFields])

  const total = filtered.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, pageCount)
  const startIndex = (currentPage - 1) * pageSize
  const pageItems = filtered.slice(startIndex, startIndex + pageSize)

  // Reset to page 1 whenever a filter or page size changes.
  const setSearch = (value: string) => { setSearchValue(value); setPage(1) }
  const setPageSize = (value: number) => { setPageSizeValue(value); setPage(1) }

  return {
    search,
    setSearch,
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    density,
    setDensity,
    filtered,
    pageItems,
    pageCount,
    total,
  }
}
