import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useVirtualMachineSearchParams } from './useVirtualMachineSearchParams'

describe('useVirtualMachineSearchParams', () => {
  it('parses valid values and falls back for invalid pagination', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?page=-2&pageSize=99&tags=prod,db&untagged=true&providerId=null']}>
        {children}
      </MemoryRouter>
    )
    const { result } = renderHook(() => useVirtualMachineSearchParams(), { wrapper })

    expect(result.current.query).toMatchObject({
      page: 1,
      pageSize: 10,
      tags: ['prod', 'db'],
      untagged: true,
      providerId: null,
    })
  })

  it('updates filters and resets the page', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?page=3']}>{children}</MemoryRouter>
    )
    const { result } = renderHook(() => useVirtualMachineSearchParams(), { wrapper })

    act(() => {
      result.current.updateFilters({
        search: 'db',
        powerState: '',
        connectionState: '',
        cluster: '',
        providerId: null,
        tags: [],
        untagged: false,
      })
    })

    expect(result.current.query.page).toBe(1)
    expect(result.current.query.search).toBe('db')
  })

  it('writes normalized page and page size when filters reset pagination', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?page=3&pageSize=25']}>
        {children}
      </MemoryRouter>
    )
    const { result } = renderHook(() => {
      const state = useVirtualMachineSearchParams()
      const location = useLocation()
      return { ...state, locationSearch: location.search }
    }, { wrapper })

    act(() => {
      result.current.updateFilters({
        search: 'db',
        powerState: '',
        connectionState: '',
        cluster: '',
        providerId: null,
        tags: [],
        untagged: false,
      })
    })

    const params = new URLSearchParams(result.current.locationSearch)
    expect(params.get('page')).toBe('1')
    expect(params.get('pageSize')).toBe('25')
  })
})
