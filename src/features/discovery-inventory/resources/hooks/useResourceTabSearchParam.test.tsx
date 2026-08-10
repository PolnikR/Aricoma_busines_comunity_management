import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { useResourceTabSearchParam } from './useResourceTabSearchParam'

describe('useResourceTabSearchParam', () => {
  it('reads the selected resource tab and provider from the URL', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?resource=flashsystem&providerId=flash-01&search=db']}>{children}</MemoryRouter>
    )
    const { result } = renderHook(() => ({ ...useResourceTabSearchParam(), location: useLocation() }), { wrapper })

    expect(result.current.resourceTab).toBe('flashsystem')
    expect(result.current.providerId).toBe('flash-01')
  })

  it('updates resource and provider together while preserving unrelated search params', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?resource=flashsystem&providerId=flash-01&search=db&page=4']}>{children}</MemoryRouter>
    )
    const { result } = renderHook(() => ({ ...useResourceTabSearchParam(), location: useLocation() }), { wrapper })

    act(() => { result.current.setResourceSource({ resourceTab: 'ibm-power', providerId: 'power-01' }) })

    const searchParams = new URLSearchParams(result.current.location.search)
    expect(searchParams.get('resource')).toBe('ibm-power')
    expect(searchParams.get('providerId')).toBe('power-01')
    expect(searchParams.get('search')).toBe('db')
    expect(searchParams.get('page')).toBe('1')
  })

  it('clears resource and provider params for the default fallback tab', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?resource=ibm-power&providerId=power-01&search=db&page=4']}>{children}</MemoryRouter>
    )
    const { result } = renderHook(() => ({ ...useResourceTabSearchParam(), location: useLocation() }), { wrapper })

    act(() => { result.current.setResourceSource({ resourceTab: 'vmware', providerId: null }) })

    expect(result.current.resourceTab).toBe('vmware')
    expect(result.current.providerId).toBeNull()

    const searchParams = new URLSearchParams(result.current.location.search)
    expect(searchParams.has('resource')).toBe(false)
    expect(searchParams.has('providerId')).toBe(false)
    expect(searchParams.get('page')).toBe('1')
  })
})
