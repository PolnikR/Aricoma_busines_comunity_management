import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { useRecoveryRunsTabSearchParam } from './useRecoveryRunsTabSearchParam'

describe('useRecoveryRunsTabSearchParam', () => {
  it('defaults to the "all" tab and no entity filter with no query params', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>
    const { result } = renderHook(() => useRecoveryRunsTabSearchParam(), { wrapper })

    expect(result.current.tab).toBe('all')
    expect(result.current.entityId).toBeNull()
  })

  it('reads tab and entityId from the URL', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?tab=applications&entityId=finance_recovery']}>{children}</MemoryRouter>
    )
    const { result } = renderHook(() => useRecoveryRunsTabSearchParam(), { wrapper })

    expect(result.current.tab).toBe('applications')
    expect(result.current.entityId).toBe('finance_recovery')
  })

  it('falls back to "all" for an unknown tab value', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?tab=bogus']}>{children}</MemoryRouter>
    )
    const { result } = renderHook(() => useRecoveryRunsTabSearchParam(), { wrapper })

    expect(result.current.tab).toBe('all')
  })

  it('setTab updates the tab and clears any entity filter', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?tab=applications&entityId=finance_recovery']}>{children}</MemoryRouter>
    )
    const { result } = renderHook(() => ({ ...useRecoveryRunsTabSearchParam(), location: useLocation() }), { wrapper })

    act(() => { result.current.setTab('groups') })

    const searchParams = new URLSearchParams(result.current.location.search)
    expect(searchParams.get('tab')).toBe('groups')
    expect(searchParams.has('entityId')).toBe(false)
  })

  it('setTab to "all" removes the tab param entirely', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?tab=groups']}>{children}</MemoryRouter>
    )
    const { result } = renderHook(() => ({ ...useRecoveryRunsTabSearchParam(), location: useLocation() }), { wrapper })

    act(() => { result.current.setTab('all') })

    const searchParams = new URLSearchParams(result.current.location.search)
    expect(searchParams.has('tab')).toBe(false)
  })

  it('setEntityId sets or clears the entity filter without touching the tab', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?tab=groups']}>{children}</MemoryRouter>
    )
    const { result } = renderHook(() => ({ ...useRecoveryRunsTabSearchParam(), location: useLocation() }), { wrapper })

    act(() => { result.current.setEntityId('billing_group') })
    expect(new URLSearchParams(result.current.location.search).get('entityId')).toBe('billing_group')
    expect(new URLSearchParams(result.current.location.search).get('tab')).toBe('groups')

    act(() => { result.current.setEntityId(null) })
    expect(new URLSearchParams(result.current.location.search).has('entityId')).toBe(false)
  })
})
