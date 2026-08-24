import type { ReactNode } from 'react'
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { readProviderFilterSnapshot } from '../state/providerFilterSession'
import { useResourceTabSearchParam } from './useResourceTabSearchParam'
import { usePowerSearchParams } from './usePowerSearchParams'

interface PowerProviderScope {
  id: string
  role?: 'source' | 'target'
}

const sourceProvider: PowerProviderScope = { id: 'power-1', role: 'source' }

function providerScope(provider: PowerProviderScope) {
  return { role: provider.role ?? 'source', resourceTab: 'ibm-power' as const, providerId: provider.id }
}

function PowerSearchParamsState({ provider }: { provider: PowerProviderScope }) {
  const { query, updateFilters } = usePowerSearchParams(provider)
  const location = useLocation()

  return (
    <>
      <output data-testid="power-query">{`${query.search}:${query.partitionKind}:${query.partitionState}:${query.operatingSystemType}:${query.volumeState}:${String(query.page)}`}</output>
      <output data-testid="power-location">{location.search}</output>
      <button onClick={() => { updateFilters({ search: 'partition', partitionKind: 'LPAR', partitionState: 'running', operatingSystemType: 'AIX', volumeState: 'active' }) }}>Use custom filters</button>
      <button onClick={() => { updateFilters({ search: '', partitionKind: '', partitionState: '', operatingSystemType: '', volumeState: '' }) }}>Clear filters</button>
    </>
  )
}

function ResourceSourceSwitchingState() {
  const { resourceTab, providerId, setResourceSource } = useResourceTabSearchParam()
  const provider = providerId === 'power-2' ? { id: 'power-2', role: 'source' as const } : sourceProvider

  return (
    <>
      <button onClick={() => { setResourceSource({ resourceTab: 'ibm-power', providerId: 'power-1' }) }}>Select provider A</button>
      <button onClick={() => { setResourceSource({ resourceTab: 'ibm-power', providerId: 'power-2' }) }}>Select provider B</button>
      <button onClick={() => { setResourceSource({ resourceTab: 'flashsystem', providerId: 'flash-1' }) }}>Select FlashSystem</button>
      {resourceTab === 'ibm-power' && <PowerSearchParamsState key={provider.id} provider={provider} />}
    </>
  )
}

afterEach(() => {
  sessionStorage.clear()
})

describe('usePowerSearchParams', () => {
  it('initializes the provider scope without changing location', () => {
    render(<PowerSearchParamsState provider={sourceProvider} />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    })

    expect(screen.getByTestId('power-query')).toHaveTextContent(':::::1')
    expect(screen.getByTestId('power-location')).toBeEmptyDOMElement()
  })

  it('restores a provider snapshot after provider and resource switches', async () => {
    render(<ResourceSourceSwitchingState />, {
      wrapper: ({ children }) => <MemoryRouter initialEntries={['/?resource=ibm-power&providerId=power-1']}>{children}</MemoryRouter>,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Use custom filters' }))
    await waitFor(() => { expect(screen.getByTestId('power-query')).toHaveTextContent('partition:LPAR:running:AIX:active:1') })

    fireEvent.click(screen.getByRole('button', { name: 'Select provider B' }))
    await waitFor(() => { expect(screen.getByTestId('power-query')).toHaveTextContent(':::::1') })
    fireEvent.click(screen.getByRole('button', { name: 'Select provider A' }))
    await waitFor(() => { expect(screen.getByTestId('power-query')).toHaveTextContent('partition:LPAR:running:AIX:active:1') })

    fireEvent.click(screen.getByRole('button', { name: 'Select FlashSystem' }))
    fireEvent.click(screen.getByRole('button', { name: 'Select provider A' }))
    await waitFor(() => { expect(screen.getByTestId('power-query')).toHaveTextContent('partition:LPAR:running:AIX:active:1') })
  })

  it('restores filters after refresh, while explicit URL filters take precedence', async () => {
    const firstView = render(<PowerSearchParamsState provider={sourceProvider} />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Use custom filters' }))
    await waitFor(() => { expect(readProviderFilterSnapshot(providerScope(sourceProvider))?.filters.search).toBe('partition') })
    firstView.unmount()

    const refreshedView = render(<PowerSearchParamsState provider={sourceProvider} />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    })
    await waitFor(() => { expect(screen.getByTestId('power-query')).toHaveTextContent('partition:LPAR:running:AIX:active:1') })
    refreshedView.unmount()

    render(<PowerSearchParamsState provider={sourceProvider} />, {
      wrapper: ({ children }) => <MemoryRouter initialEntries={['/?search=url-value&partitionKind=url-kind']}>{children}</MemoryRouter>,
    })
    await waitFor(() => { expect(screen.getByTestId('power-query')).toHaveTextContent('url-value:url-kind::::1') })
  })

  it('persists an explicitly cleared filter state and resets the page', async () => {
    const firstView = render(<PowerSearchParamsState provider={sourceProvider} />, {
      wrapper: ({ children }) => <MemoryRouter initialEntries={['/?page=4']}>{children}</MemoryRouter>,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Use custom filters' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    await waitFor(() => {
      expect(readProviderFilterSnapshot(providerScope(sourceProvider))?.filters).toEqual({
        search: '', partitionKind: '', partitionState: '', operatingSystemType: '', volumeState: '',
      })
      expect(screen.getByTestId('power-query')).toHaveTextContent(':::::1')
    })
    firstView.unmount()

    render(<PowerSearchParamsState provider={sourceProvider} />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    })
    await waitFor(() => { expect(screen.getByTestId('power-query')).toHaveTextContent(':::::1') })
  })

  it('isolates source and target snapshots for the same provider', async () => {
    const sourceView = render(<PowerSearchParamsState provider={sourceProvider} />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Use custom filters' }))
    await waitFor(() => { expect(readProviderFilterSnapshot(providerScope(sourceProvider))?.filters.search).toBe('partition') })
    sourceView.unmount()

    const targetProvider = { ...sourceProvider, role: 'target' as const }
    const targetView = render(<PowerSearchParamsState provider={targetProvider} />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    })
    await waitFor(() => { expect(screen.getByTestId('power-query')).toHaveTextContent(':::::1') })
    targetView.unmount()

    render(<PowerSearchParamsState provider={sourceProvider} />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    })
    await waitFor(() => { expect(screen.getByTestId('power-query')).toHaveTextContent('partition:LPAR:running:AIX:active:1') })
  })

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
