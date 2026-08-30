import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useDiscoverySettingsSearchParams } from './useDiscoverySettingsSearchParams'

function createWrapper(entry = '/') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
  }
}

function useSearchParamsState() {
  return { ...useDiscoverySettingsSearchParams(), location: useLocation() }
}

describe('useDiscoverySettingsSearchParams', () => {
  it.each(['configuration', 'history', 'notifications'] as const)('reads the valid %s tab from a deep link', tab => {
    const { result } = renderHook(() => useDiscoverySettingsSearchParams(), {
      wrapper: createWrapper(`/?tab=${tab}`),
    })

    expect(result.current.tab).toBe(tab)
  })

  it('defaults to configuration and the default History limit without URL state', () => {
    const { result } = renderHook(() => useDiscoverySettingsSearchParams(), { wrapper: createWrapper() })

    expect(result.current.tab).toBe('configuration')
    expect(result.current.providerId).toBeUndefined()
    expect(result.current.limit).toBe(50)
  })

  it('falls back to defaults for invalid tab and History limit values', () => {
    const { result } = renderHook(() => useDiscoverySettingsSearchParams(), {
      wrapper: createWrapper('/?tab=unknown&limit=10'),
    })

    expect(result.current.tab).toBe('configuration')
    expect(result.current.limit).toBe(50)
  })

  it('omits the configuration tab and default limit while preserving unrelated parameters', () => {
    const { result } = renderHook(useSearchParamsState, {
      wrapper: createWrapper('/?tab=history&limit=100&keep=visible'),
    })

    act(() => { result.current.setTab('configuration') })
    act(() => { result.current.setLimit(50) })

    const params = new URLSearchParams(result.current.location.search)
    expect(params.has('tab')).toBe(false)
    expect(params.has('limit')).toBe(false)
    expect(params.get('keep')).toBe('visible')
  })

  it('preserves applied History criteria when tabs change', () => {
    const { result } = renderHook(useSearchParamsState, {
      wrapper: createWrapper('/?tab=history&providerId=vmware-vcenter-01&limit=100'),
    })

    act(() => { result.current.setTab('notifications') })
    expect(result.current.providerId).toBe('vmware-vcenter-01')
    expect(result.current.limit).toBe(100)

    act(() => { result.current.setTab('history') })
    expect(result.current.providerId).toBe('vmware-vcenter-01')
    expect(result.current.limit).toBe(100)
  })

  it('trims provider IDs and removes the criterion when All providers is selected', () => {
    const { result } = renderHook(useSearchParamsState, {
      wrapper: createWrapper('/?tab=history&keep=visible'),
    })

    act(() => { result.current.setProviderId('  vmware-vcenter-01  ') })
    expect(result.current.providerId).toBe('vmware-vcenter-01')
    expect(new URLSearchParams(result.current.location.search).get('providerId')).toBe('vmware-vcenter-01')

    act(() => { result.current.setProviderId('   ') })
    expect(result.current.providerId).toBeUndefined()
    expect(new URLSearchParams(result.current.location.search).has('providerId')).toBe(false)
    expect(new URLSearchParams(result.current.location.search).get('keep')).toBe('visible')
  })

  it.each([25, 50, 100] as const)('uses supported History limit %s', limit => {
    const { result } = renderHook(useSearchParamsState, { wrapper: createWrapper() })

    act(() => { result.current.setLimit(limit) })

    expect(result.current.limit).toBe(limit)
    expect(new URLSearchParams(result.current.location.search).get('limit')).toBe(limit === 50 ? null : String(limit))
  })
})
