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

  it('defaults to configuration without History server-limit state', () => {
    const { result } = renderHook(() => useDiscoverySettingsSearchParams(), { wrapper: createWrapper() })

    expect(result.current.tab).toBe('configuration')
    expect(result.current.providerId).toBeUndefined()
    expect(result.current).not.toHaveProperty('limit')
    expect(result.current).not.toHaveProperty('setLimit')
  })

  it('falls back to configuration and ignores a legacy History limit parameter', () => {
    const { result } = renderHook(() => useDiscoverySettingsSearchParams(), {
      wrapper: createWrapper('/?tab=unknown&limit=100'),
    })

    expect(result.current.tab).toBe('configuration')
    expect(result.current).not.toHaveProperty('limit')
  })

  it('omits the configuration tab while preserving unrelated parameters', () => {
    const { result } = renderHook(useSearchParamsState, {
      wrapper: createWrapper('/?tab=history&limit=100&keep=visible'),
    })

    act(() => { result.current.setTab('configuration') })

    const params = new URLSearchParams(result.current.location.search)
    expect(params.has('tab')).toBe(false)
    expect(params.get('limit')).toBe('100')
    expect(params.get('keep')).toBe('visible')
  })

  it('preserves the applied provider criterion when tabs change', () => {
    const { result } = renderHook(useSearchParamsState, {
      wrapper: createWrapper('/?tab=history&providerId=vmware-vcenter-01'),
    })

    act(() => { result.current.setTab('notifications') })
    expect(result.current.providerId).toBe('vmware-vcenter-01')

    act(() => { result.current.setTab('history') })
    expect(result.current.providerId).toBe('vmware-vcenter-01')
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
})
