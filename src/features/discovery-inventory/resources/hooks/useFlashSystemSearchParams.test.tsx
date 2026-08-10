import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useFlashSystemSearchParams } from './useFlashSystemSearchParams'

describe('useFlashSystemSearchParams', () => {
  it('restores FlashSystem pagination and filters from the URL', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?resource=flashsystem&providerId=flash-01&page=3&pageSize=25&search=db&poolId=pool-1&status=online']}>
        {children}
      </MemoryRouter>
    )
    const { result } = renderHook(() => useFlashSystemSearchParams(), { wrapper })

    expect(result.current.query).toMatchObject({
      page: 3,
      pageSize: 25,
      search: 'db',
      poolId: 'pool-1',
      hostId: '',
      status: 'online',
    })
  })

  it('resets to page one when a FlashSystem filter changes', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?page=4&pageSize=25&status=online']}>
        {children}
      </MemoryRouter>
    )
    const { result } = renderHook(() => {
      const state = useFlashSystemSearchParams()
      const location = useLocation()
      return { ...state, locationSearch: location.search }
    }, { wrapper })

    act(() => {
      result.current.updateFilters({ search: 'database', status: '' })
    })

    const params = new URLSearchParams(result.current.locationSearch)
    expect(params.get('page')).toBe('1')
    expect(params.get('pageSize')).toBe('25')
    expect(params.get('search')).toBe('database')
    expect(params.has('status')).toBe(false)
  })
})
