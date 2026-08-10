import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useResourceInventorySearchParams } from './useResourceInventorySearchParams'

function useStateWithLocation() {
  const state = useResourceInventorySearchParams()
  const location = useLocation()
  return { ...state, locationSearch: location.search }
}

function createWrapper(initialEntry: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  )
}

describe('useResourceInventorySearchParams', () => {
  it('normalizes missing and invalid pagination values to safe defaults', () => {
    const { result } = renderHook(() => useStateWithLocation(), {
      wrapper: createWrapper('/?page=-2&pageSize=99&search=database'),
    })

    expect(result.current.query).toEqual({ page: 1, pageSize: 10, search: 'database' })
  })

  it('updates pagination without dropping unrelated resource context', () => {
    const { result } = renderHook(() => useStateWithLocation(), {
      wrapper: createWrapper('/?resource=flashsystem&providerId=flash-01&page=3&custom=keep'),
    })

    act(() => {
      result.current.updateQuery({ page: 2, pageSize: 25 })
    })

    const params = new URLSearchParams(result.current.locationSearch)
    expect(params.get('resource')).toBe('flashsystem')
    expect(params.get('providerId')).toBe('flash-01')
    expect(params.get('custom')).toBe('keep')
    expect(params.get('page')).toBe('2')
    expect(params.get('pageSize')).toBe('25')
  })

  it('resets page and serializes arrays, booleans, and empty values', () => {
    const { result } = renderHook(() => useStateWithLocation(), {
      wrapper: createWrapper('/?page=4&tags=old&untagged=true&search=old'),
    })

    act(() => {
      result.current.updateQuery({
        search: 'database',
        tags: ['prod', 'critical'],
        untagged: false,
      }, true)
    })

    const params = new URLSearchParams(result.current.locationSearch)
    expect(params.get('page')).toBe('1')
    expect(params.get('search')).toBe('database')
    expect(params.get('tags')).toBe('prod,critical')
    expect(params.has('untagged')).toBe(false)
  })
})
