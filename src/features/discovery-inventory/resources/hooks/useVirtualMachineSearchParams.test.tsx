import type { ReactNode } from 'react'
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { type VirtualMachineProviderScope, useVirtualMachineSearchParams } from './useVirtualMachineSearchParams'

function VirtualMachineSearchParamsState({ provider }: { provider: VirtualMachineProviderScope }) {
  const { query, updateFilters, isInitialized } = useVirtualMachineSearchParams(provider)

  return (
    <>
      <output data-testid="vmware-query">{`${query.search}:${query.tags.join(',')}`}</output>
      <output data-testid="vmware-initialized">{String(isInitialized)}</output>
      <button onClick={() => {
        updateFilters({
          search: 'user-prefix-',
          powerState: '',
          connectionState: '',
          cluster: '',
          tags: ['user-tag'],
          untagged: false,
        })
      }}>
        Use custom filters
      </button>
    </>
  )
}

describe('useVirtualMachineSearchParams', () => {
  it('reports initialization readiness before provider defaults can activate inventory', async () => {
    const readiness: boolean[] = []
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/']}>
        {children}
      </MemoryRouter>
    )
    function Observer() {
      const { isInitialized } = useVirtualMachineSearchParams({
        id: 'provider-1',
        vmPrefix: ' prod- ',
        vmTags: ['prod'],
      })
      readiness.push(isInitialized)
      return null
    }

    render(<Observer />, { wrapper })

    expect(readiness[0]).toBe(false)
    await waitFor(() => { expect(readiness.at(-1)).toBe(true) })
  })

  it('initializes trimmed provider defaults and exposes only the first URL tag', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/']}>
        {children}
      </MemoryRouter>
    )
    const { result } = renderHook(
      () => useVirtualMachineSearchParams({ id: 'provider-1', vmPrefix: ' prod- ', vmTags: ['prod', 'db'] }),
      { wrapper },
    )

    expect(result.current.query.search).toBe('prod-')
    expect(result.current.query.tags).toEqual(['prod'])
  })

  it('preserves explicit URL filters over provider defaults', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?search=url-&tags=url-tag,other']}>
        {children}
      </MemoryRouter>
    )
    const { result } = renderHook(
      () => useVirtualMachineSearchParams({ id: 'provider-1', vmPrefix: ' provider- ', vmTags: ['provider-tag'] }),
      { wrapper },
    )

    expect(result.current.query.search).toBe('url-')
    expect(result.current.query.tags).toEqual(['url-tag'])
  })

  it('replaces inherited defaults but preserves user filters when providers switch', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/']}>
        {children}
      </MemoryRouter>
    )
    const { result, rerender } = renderHook(
      ({ id, vmPrefix, vmTag }: { id: string; vmPrefix: string; vmTag: string }) => useVirtualMachineSearchParams({
        id,
        vmPrefix,
        vmTags: [vmTag],
      }),
      { wrapper, initialProps: { id: 'provider-a', vmPrefix: 'provider-a-', vmTag: 'provider-a-tag' } },
    )

    expect(result.current.query.search).toBe('provider-a-')
    expect(result.current.query.tags).toEqual(['provider-a-tag'])

    rerender({ id: 'provider-b', vmPrefix: 'provider-b-', vmTag: 'provider-b-tag' })

    expect(result.current.query.search).toBe('provider-b-')
    expect(result.current.query.tags).toEqual(['provider-b-tag'])

    act(() => {
      result.current.updateFilters({
        search: 'user-prefix-',
        powerState: '',
        connectionState: '',
        cluster: '',
        tags: ['user-tag'],
        untagged: false,
      })
    })

    rerender({ id: 'provider-c', vmPrefix: 'provider-c-', vmTag: 'provider-c-tag' })

    expect(result.current.query.search).toBe('user-prefix-')
    expect(result.current.query.tags).toEqual(['user-tag'])
  })

  it('replaces inherited defaults but preserves user filters across keyed provider remounts', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/']}>
        {children}
      </MemoryRouter>
    )
    const view = render(
      <VirtualMachineSearchParamsState
        key="provider-a"
        provider={{ id: 'provider-a', vmPrefix: 'provider-a-', vmTags: ['provider-a-tag'] }}
      />,
      { wrapper },
    )

    expect(screen.getByTestId('vmware-query')).toHaveTextContent('provider-a-:provider-a-tag')

    view.rerender(
      <VirtualMachineSearchParamsState
        key="provider-b"
        provider={{ id: 'provider-b', vmPrefix: 'provider-b-', vmTags: ['provider-b-tag'] }}
      />,
    )

    expect(screen.getByTestId('vmware-query')).toHaveTextContent('provider-b-:provider-b-tag')

    fireEvent.click(screen.getByRole('button', { name: 'Use custom filters' }))
    expect(screen.getByTestId('vmware-query')).toHaveTextContent('user-prefix-:user-tag')

    view.rerender(
      <VirtualMachineSearchParamsState
        key="provider-c"
        provider={{ id: 'provider-c', vmPrefix: 'provider-c-', vmTags: ['provider-c-tag'] }}
      />,
    )

    expect(screen.getByTestId('vmware-query')).toHaveTextContent('user-prefix-:user-tag')
  })

  it('does not restore cleared defaults and initializes defaults for a new provider', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/']}>
        {children}
      </MemoryRouter>
    )
    const { result, rerender } = renderHook(
      ({ providerId }: { providerId: string }) => useVirtualMachineSearchParams({
        id: providerId,
        vmPrefix: `${providerId}-prefix`,
        vmTags: [`${providerId}-tag`],
      }),
      { wrapper, initialProps: { providerId: 'provider-1' } },
    )

    act(() => {
      result.current.updateFilters({
        search: '',
        powerState: '',
        connectionState: '',
        cluster: '',
        tags: [],
        untagged: false,
      })
    })
    expect(result.current.query.search).toBe('')
    expect(result.current.query.tags).toEqual([])
    expect(result.current.isInitialized).toBe(true)

    rerender({ providerId: 'provider-2' })

    expect(result.current.query.search).toBe('provider-2-prefix')
    expect(result.current.query.tags).toEqual(['provider-2-tag'])
  })

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
      tags: ['prod'],
      untagged: true,
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
        tags: [],
        untagged: false,
      })
    })

    const params = new URLSearchParams(result.current.locationSearch)
    expect(params.get('page')).toBe('1')
    expect(params.get('pageSize')).toBe('25')
  })
})
