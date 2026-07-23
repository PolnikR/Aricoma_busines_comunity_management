import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useTableState } from './useTableState'

interface Row {
  id: string
  name: string
  type: string
}

const rows: Row[] = [
  { id: '1', name: 'Alpha', type: 'VMWARE' },
  { id: '2', name: 'Bravo', type: 'FLASHCOPY' },
  { id: '3', name: 'Alfredo', type: 'VMWARE' },
  { id: '4', name: 'Charlie', type: 'VMWARE' },
]

describe('useTableState', () => {
  it('filters by search across the given fields', () => {
    const { result } = renderHook(() => useTableState(rows, { searchFields: ['name'] }))

    act(() => { result.current.setSearch('alf') })

    expect(result.current.filtered.map((r) => r.id)).toEqual(['3'])
    expect(result.current.total).toBe(1)
  })

  it('applies an extra predicate together with search', () => {
    const { result } = renderHook(() => useTableState(rows, { searchFields: ['name'], predicate: (r) => r.type === 'VMWARE' }))

    expect(result.current.total).toBe(3)
    act(() => { result.current.setSearch('al') })
    expect(result.current.filtered.map((r) => r.id)).toEqual(['1', '3'])
  })

  it('paginates and clamps the current page', () => {
    const { result } = renderHook(() => useTableState(rows, { searchFields: ['name'], initialPageSize: 2 }))

    expect(result.current.pageCount).toBe(2)
    expect(result.current.pageItems.map((r) => r.id)).toEqual(['1', '2'])

    act(() => { result.current.setPage(2) })
    expect(result.current.pageItems.map((r) => r.id)).toEqual(['3', '4'])
  })

  it('resets to page 1 when the search changes', () => {
    const { result } = renderHook(() => useTableState(rows, { searchFields: ['name'], initialPageSize: 2 }))

    act(() => { result.current.setPage(2) })
    expect(result.current.page).toBe(2)

    act(() => { result.current.setSearch('a') })
    expect(result.current.page).toBe(1)
  })

  it('resets to page 1 when the page size changes', () => {
    const { result } = renderHook(() => useTableState(rows, { searchFields: ['name'], initialPageSize: 2 }))

    act(() => { result.current.setPage(2) })
    act(() => { result.current.setPageSize(10) })
    expect(result.current.page).toBe(1)
    expect(result.current.pageItems).toHaveLength(4)
  })
})
