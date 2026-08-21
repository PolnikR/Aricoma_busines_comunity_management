import type { ReactNode } from 'react'
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { readProviderFilterSnapshot } from '../state/providerFilterSession'
import { useResourceTabSearchParam } from './useResourceTabSearchParam'
import { useFlashSystemSearchParams } from './useFlashSystemSearchParams'

interface FlashSystemProviderScope {
  id: string
  role?: 'source' | 'target'
}

const sourceProvider: FlashSystemProviderScope = { id: 'flash-1', role: 'source' }

function providerScope(provider: FlashSystemProviderScope) {
  return { role: provider.role ?? 'source', resourceTab: 'flashsystem' as const, providerId: provider.id }
}

function FlashSystemSearchParamsState({ provider }: { provider: FlashSystemProviderScope }) {
  const { query, updateFilters } = useFlashSystemSearchParams(provider)

  return (
    <>
      <output data-testid="flashsystem-query">{`${query.search}:${query.poolId}:${query.hostId}:${query.status}:${String(query.page)}`}</output>
      <button onClick={() => { updateFilters({ search: 'database', poolId: 'pool-1', hostId: 'host-1', status: 'online' }) }}>Use custom filters</button>
      <button onClick={() => { updateFilters({ search: '', poolId: '', hostId: '', status: '' }) }}>Clear filters</button>
    </>
  )
}

function ResourceSourceSwitchingState() {
  const { resourceTab, providerId, setResourceSource } = useResourceTabSearchParam()
  const provider = providerId === 'flash-2' ? { id: 'flash-2', role: 'source' as const } : sourceProvider

  return (
    <>
      <button onClick={() => { setResourceSource({ resourceTab: 'flashsystem', providerId: 'flash-1' }) }}>Select provider A</button>
      <button onClick={() => { setResourceSource({ resourceTab: 'flashsystem', providerId: 'flash-2' }) }}>Select provider B</button>
      <button onClick={() => { setResourceSource({ resourceTab: 'ibm-power', providerId: 'power-1' }) }}>Select IBM Power</button>
      {resourceTab === 'flashsystem' && <FlashSystemSearchParamsState key={provider.id} provider={provider} />}
    </>
  )
}

afterEach(() => {
  sessionStorage.clear()
})

describe('useFlashSystemSearchParams', () => {
  it('restores a provider snapshot after provider and resource switches', async () => {
    render(<ResourceSourceSwitchingState />, {
      wrapper: ({ children }) => <MemoryRouter initialEntries={['/?resource=flashsystem&providerId=flash-1']}>{children}</MemoryRouter>,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Use custom filters' }))
    await waitFor(() => { expect(screen.getByTestId('flashsystem-query')).toHaveTextContent('database:pool-1:host-1:online:1') })

    fireEvent.click(screen.getByRole('button', { name: 'Select provider B' }))
    await waitFor(() => { expect(screen.getByTestId('flashsystem-query')).toHaveTextContent('::::1') })
    fireEvent.click(screen.getByRole('button', { name: 'Select provider A' }))
    await waitFor(() => { expect(screen.getByTestId('flashsystem-query')).toHaveTextContent('database:pool-1:host-1:online:1') })

    fireEvent.click(screen.getByRole('button', { name: 'Select IBM Power' }))
    fireEvent.click(screen.getByRole('button', { name: 'Select provider A' }))
    await waitFor(() => { expect(screen.getByTestId('flashsystem-query')).toHaveTextContent('database:pool-1:host-1:online:1') })
  })

  it('restores filters after refresh, while explicit URL filters take precedence', async () => {
    const firstView = render(<FlashSystemSearchParamsState provider={sourceProvider} />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Use custom filters' }))
    await waitFor(() => { expect(readProviderFilterSnapshot(providerScope(sourceProvider))?.filters.search).toBe('database') })
    firstView.unmount()

    const refreshedView = render(<FlashSystemSearchParamsState provider={sourceProvider} />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    })
    await waitFor(() => { expect(screen.getByTestId('flashsystem-query')).toHaveTextContent('database:pool-1:host-1:online:1') })
    refreshedView.unmount()

    render(<FlashSystemSearchParamsState provider={sourceProvider} />, {
      wrapper: ({ children }) => <MemoryRouter initialEntries={['/?search=url-value&poolId=url-pool']}>{children}</MemoryRouter>,
    })
    await waitFor(() => { expect(screen.getByTestId('flashsystem-query')).toHaveTextContent('url-value:url-pool:::1') })
  })

  it('persists an explicitly cleared filter state and resets the page', async () => {
    const firstView = render(<FlashSystemSearchParamsState provider={sourceProvider} />, {
      wrapper: ({ children }) => <MemoryRouter initialEntries={['/?page=4']}>{children}</MemoryRouter>,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Use custom filters' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    await waitFor(() => {
      expect(readProviderFilterSnapshot(providerScope(sourceProvider))?.filters).toEqual({
        search: '', poolId: '', hostId: '', status: '',
      })
      expect(screen.getByTestId('flashsystem-query')).toHaveTextContent('::::1')
    })
    firstView.unmount()

    render(<FlashSystemSearchParamsState provider={sourceProvider} />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    })
    await waitFor(() => { expect(screen.getByTestId('flashsystem-query')).toHaveTextContent('::::1') })
  })

  it('isolates source and target snapshots for the same provider', async () => {
    const sourceView = render(<FlashSystemSearchParamsState provider={sourceProvider} />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Use custom filters' }))
    await waitFor(() => { expect(readProviderFilterSnapshot(providerScope(sourceProvider))?.filters.search).toBe('database') })
    sourceView.unmount()

    const targetProvider = { ...sourceProvider, role: 'target' as const }
    const targetView = render(<FlashSystemSearchParamsState provider={targetProvider} />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    })
    await waitFor(() => { expect(screen.getByTestId('flashsystem-query')).toHaveTextContent('::::1') })
    targetView.unmount()

    render(<FlashSystemSearchParamsState provider={sourceProvider} />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    })
    await waitFor(() => { expect(screen.getByTestId('flashsystem-query')).toHaveTextContent('database:pool-1:host-1:online:1') })
  })

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
