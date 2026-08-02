import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
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
})
