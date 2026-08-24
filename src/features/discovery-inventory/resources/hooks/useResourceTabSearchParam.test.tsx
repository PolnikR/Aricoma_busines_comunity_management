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

  it('updates resource and provider together while clearing outgoing resource filters', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?resource=flashsystem&providerId=flash-01&search=db&page=4&pageSize=25&poolId=pool-1&status=online&flashSystemActiveProvider=source%3Aflashsystem%3Aflash-01&powerActiveProvider=stale']}>{children}</MemoryRouter>
    )
    const { result } = renderHook(() => ({ ...useResourceTabSearchParam(), location: useLocation() }), { wrapper })

    act(() => { result.current.setResourceSource({ resourceTab: 'ibm-power', providerId: 'power-01' }) })

    const searchParams = new URLSearchParams(result.current.location.search)
    expect(searchParams.get('resource')).toBe('ibm-power')
    expect(searchParams.get('providerId')).toBe('power-01')
    expect(searchParams.has('search')).toBe(false)
    expect(searchParams.get('page')).toBe('1')
    expect(searchParams.get('pageSize')).toBe('25')
    expect(searchParams.has('poolId')).toBe(false)
    expect(searchParams.has('status')).toBe(false)
    expect(searchParams.has('flashSystemActiveProvider')).toBe(false)
    expect(searchParams.has('powerActiveProvider')).toBe(false)
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

  it('clears only inherited VMware defaults before switching VMware providers', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?providerId=vmware-a&search=provider-a-&tags=provider-a-tag&vmwareDefaultSearch=provider-a-&vmwareDefaultTag=provider-a-tag']}>
        {children}
      </MemoryRouter>
    )
    const { result } = renderHook(() => ({ ...useResourceTabSearchParam(), location: useLocation() }), { wrapper })

    act(() => { result.current.setResourceSource({ resourceTab: 'vmware', providerId: 'vmware-b' }) })

    const searchParams = new URLSearchParams(result.current.location.search)
    expect(searchParams.get('providerId')).toBe('vmware-b')
    expect(searchParams.has('search')).toBe(false)
    expect(searchParams.has('tags')).toBe(false)
    expect(searchParams.has('vmwareDefaultSearch')).toBe(false)
    expect(searchParams.has('vmwareDefaultTag')).toBe(false)
  })

  it('clears an unmarked VMware search when switching VMware providers', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?providerId=vmware-a&search=user-prefix-']}>
        {children}
      </MemoryRouter>
    )
    const { result } = renderHook(() => ({ ...useResourceTabSearchParam(), location: useLocation() }), { wrapper })

    act(() => { result.current.setResourceSource({ resourceTab: 'vmware', providerId: 'vmware-b' }) })

    const searchParams = new URLSearchParams(result.current.location.search)
    expect(searchParams.get('providerId')).toBe('vmware-b')
    expect(searchParams.has('search')).toBe(false)
  })

  it('clears the outgoing VMware URL representation while preserving unrelated parameters', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?providerId=vmware-a&search=custom-&powerState=poweredOn&connectionState=connected&cluster=cluster-a&tags=tag-a&untagged=true&vmwareActiveProvider=source%3Avmware-a&keep=visible']}>{children}</MemoryRouter>
    )
    const { result } = renderHook(() => ({ ...useResourceTabSearchParam(), location: useLocation() }), { wrapper })

    act(() => { result.current.setResourceSource({ resourceTab: 'vmware', providerId: 'vmware-b' }) })

    const searchParams = new URLSearchParams(result.current.location.search)
    expect(searchParams.get('providerId')).toBe('vmware-b')
    expect(searchParams.get('keep')).toBe('visible')
    expect(searchParams.has('search')).toBe(false)
    expect(searchParams.has('powerState')).toBe(false)
    expect(searchParams.has('connectionState')).toBe(false)
    expect(searchParams.has('cluster')).toBe(false)
    expect(searchParams.has('tags')).toBe(false)
    expect(searchParams.has('untagged')).toBe(false)
    expect(searchParams.has('vmwareActiveProvider')).toBe(false)
  })

  it('does not navigate or clear filters when re-selecting the active source', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?providerId=vmware-a&search=custom-&powerState=poweredOn&page=3&pageSize=25']}>{children}</MemoryRouter>
    )
    const { result } = renderHook(() => ({ ...useResourceTabSearchParam(), location: useLocation() }), { wrapper })

    act(() => { result.current.setResourceSource({ resourceTab: 'vmware', providerId: 'vmware-a' }) })

    expect(result.current.location.search).toBe('?providerId=vmware-a&search=custom-&powerState=poweredOn&page=3&pageSize=25')
  })
})
