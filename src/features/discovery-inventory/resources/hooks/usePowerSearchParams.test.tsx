import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { usePowerSearchParams } from './usePowerSearchParams'

describe('usePowerSearchParams', () => {
  it('restores IBM Power pagination and filters from the URL', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?resource=ibm-power&providerId=power-01&page=2&pageSize=50&search=partition&partitionKind=LPAR&partitionState=running&operatingSystemType=AIX&volumeState=active']}>
        {children}
      </MemoryRouter>
    )
    const { result } = renderHook(() => usePowerSearchParams(), { wrapper })

    expect(result.current.query).toMatchObject({
      page: 2,
      pageSize: 50,
      search: 'partition',
      partitionKind: 'LPAR',
      partitionState: 'running',
      operatingSystemType: 'AIX',
      volumeState: 'active',
    })
  })

  it('resets to page one when an IBM Power filter changes', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?page=4&pageSize=25&partitionState=running']}>
        {children}
      </MemoryRouter>
    )
    const { result } = renderHook(() => {
      const state = usePowerSearchParams()
      const location = useLocation()
      return { ...state, locationSearch: location.search }
    }, { wrapper })

    act(() => {
      result.current.updateFilters({ search: 'lpar', partitionState: '' })
    })

    const params = new URLSearchParams(result.current.locationSearch)
    expect(params.get('page')).toBe('1')
    expect(params.get('pageSize')).toBe('25')
    expect(params.get('search')).toBe('lpar')
    expect(params.has('partitionState')).toBe(false)
  })
})
