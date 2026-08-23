import type { ReactNode } from 'react'
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { readProviderFilterSnapshot, writeProviderFilterSnapshot } from '../state/providerFilterSession'
import { useResourceTabSearchParam } from './useResourceTabSearchParam'
import { type VirtualMachineProviderScope, useVirtualMachineSearchParams } from './useVirtualMachineSearchParams'

const sourceProvider: VirtualMachineProviderScope = {
  id: 'provider-1',
  role: 'source',
  vmPrefix: ' provider-prefix- ',
  vmTags: ['provider-tag', 'ignored-tag'],
}

function providerScope(provider: VirtualMachineProviderScope) {
  return { role: provider.role ?? 'source', resourceTab: 'vmware' as const, providerId: provider.id }
}

function wrapperFor(entry = '/') {
  return ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
}

function VirtualMachineSearchParamsState({ provider, observations }: {
  provider: VirtualMachineProviderScope
  observations?: { isInitialized: boolean; query: string }[]
}) {
  const { query, updateFilters, updateQuery, isInitialized } = useVirtualMachineSearchParams(provider)
  const location = useLocation()
  observations?.push({ isInitialized, query: `${query.search}:${query.tags.join(',')}` })

  return (
    <>
      <output data-testid="vmware-query">{`${query.search}:${query.tags.join(',')}:${String(query.page)}`}</output>
      <output data-testid="vmware-initialized">{String(isInitialized)}</output>
      <output data-testid="vmware-location">{location.search}</output>
      <button onClick={() => {
        updateFilters({
          search: 'custom-prefix-', powerState: 'poweredOn', connectionState: '', cluster: '', tags: ['custom-tag'], untagged: false,
        })
      }}>
        Use custom filters
      </button>
      <button onClick={() => {
        updateFilters({ search: '', powerState: '', connectionState: '', cluster: '', tags: [], untagged: false })
      }}>
        Clear filters
      </button>
      <button onClick={() => { updateQuery({ page: 3 }) }}>Go to page 3</button>
    </>
  )
}

function ResourceSourceSwitchingState() {
  const { resourceTab, providerId, setResourceSource } = useResourceTabSearchParam()
  const location = useLocation()
  const provider = providerId === 'provider-2'
    ? { id: 'provider-2', role: 'source' as const, vmPrefix: 'provider-b-', vmTags: ['provider-b-tag'] }
    : sourceProvider

  return (
    <>
      <button onClick={() => { setResourceSource({ resourceTab: 'vmware', providerId: 'provider-1' }) }}>Select provider A</button>
      <button onClick={() => { setResourceSource({ resourceTab: 'vmware', providerId: 'provider-2' }) }}>Select provider B</button>
      <button onClick={() => { setResourceSource({ resourceTab: 'flashsystem', providerId: 'flash-1' }) }}>Select FlashSystem</button>
      <output data-testid="resource-location">{location.search}</output>
      {resourceTab === 'vmware' && <VirtualMachineSearchParamsState key={provider.id} provider={provider} />}
    </>
  )
}

afterEach(() => {
  sessionStorage.clear()
})

describe('useVirtualMachineSearchParams', () => {
  it('restores VMware snapshots after provider and resource switches', async () => {
    render(<ResourceSourceSwitchingState />, { wrapper: wrapperFor('/?providerId=provider-1') })

    await waitFor(() => { expect(screen.getByTestId('vmware-query')).toHaveTextContent('provider-prefix-:provider-tag:1') })
    fireEvent.click(screen.getByRole('button', { name: 'Use custom filters' }))
    await waitFor(() => { expect(screen.getByTestId('vmware-query')).toHaveTextContent('custom-prefix-:custom-tag:1') })

    fireEvent.click(screen.getByRole('button', { name: 'Select provider B' }))
    await waitFor(() => { expect(screen.getByTestId('vmware-query')).toHaveTextContent('provider-b-:provider-b-tag:1') })
    fireEvent.click(screen.getByRole('button', { name: 'Select provider A' }))
    await waitFor(() => { expect(screen.getByTestId('vmware-query')).toHaveTextContent('custom-prefix-:custom-tag:1') })

    fireEvent.click(screen.getByRole('button', { name: 'Select provider B' }))
    await waitFor(() => { expect(screen.getByTestId('vmware-query')).toHaveTextContent('provider-b-:provider-b-tag:1') })
    fireEvent.click(screen.getByRole('button', { name: 'Use custom filters' }))
    await waitFor(() => { expect(screen.getByTestId('vmware-query')).toHaveTextContent('custom-prefix-:custom-tag:1') })
    fireEvent.click(screen.getByRole('button', { name: 'Select FlashSystem' }))

    await waitFor(() => { expect(screen.getByTestId('resource-location')).not.toHaveTextContent('search=custom-prefix-') })
    expect(screen.getByTestId('resource-location')).not.toHaveTextContent('vmwareActiveProvider')

    fireEvent.click(screen.getByRole('button', { name: 'Select provider B' }))
    await waitFor(() => { expect(screen.getByTestId('vmware-query')).toHaveTextContent('custom-prefix-:custom-tag:1') })
  })

  it('applies provider defaults synchronously without changing location', () => {
    const observations: { isInitialized: boolean; query: string }[] = []
    render(<VirtualMachineSearchParamsState provider={sourceProvider} observations={observations} />, { wrapper: wrapperFor() })

    expect(observations[0]).toEqual({ isInitialized: true, query: 'provider-prefix-:provider-tag' })
    expect(screen.getByTestId('vmware-initialized')).toHaveTextContent('true')
    expect(screen.getByTestId('vmware-query')).toHaveTextContent('provider-prefix-:provider-tag:1')
    expect(screen.getByTestId('vmware-location')).toBeEmptyDOMElement()
  })

  it('prefers explicit URL filters over a saved provider snapshot', async () => {
    writeProviderFilterSnapshot(providerScope(sourceProvider), {
      resourceTab: 'vmware',
      initialized: true,
      filters: { search: 'saved-', powerState: '', connectionState: '', cluster: '', tags: ['saved-tag'], untagged: false },
    })

    render(
      <VirtualMachineSearchParamsState provider={sourceProvider} />,
      { wrapper: wrapperFor('/?search=url-&powerState=poweredOff&tags=url-tag,ignored&untagged=true') },
    )

    await waitFor(() => { expect(screen.getByTestId('vmware-initialized')).toHaveTextContent('true') })
    expect(screen.getByTestId('vmware-query')).toHaveTextContent('url-:url-tag:1')
    expect(readProviderFilterSnapshot(providerScope(sourceProvider))?.filters).toMatchObject({
      search: 'url-', powerState: 'poweredOff', tags: ['url-tag'], untagged: true,
    })
  })

  it('restores each provider snapshot when switching away and remounting', async () => {
    const view = render(<VirtualMachineSearchParamsState key="provider-a" provider={sourceProvider} />, { wrapper: wrapperFor() })

    await waitFor(() => { expect(screen.getByTestId('vmware-query')).toHaveTextContent('provider-prefix-:provider-tag:1') })
    fireEvent.click(screen.getByRole('button', { name: 'Use custom filters' }))
    expect(screen.getByTestId('vmware-query')).toHaveTextContent('custom-prefix-:custom-tag:1')

    view.rerender(
      <VirtualMachineSearchParamsState
        key="provider-b"
        provider={{ id: 'provider-2', role: 'source', vmPrefix: 'provider-b-', vmTags: ['provider-b-tag'] }}
      />,
    )
    await waitFor(() => { expect(screen.getByTestId('vmware-query')).toHaveTextContent('provider-b-:provider-b-tag:1') })

    view.rerender(<VirtualMachineSearchParamsState key="provider-a" provider={sourceProvider} />)
    await waitFor(() => { expect(screen.getByTestId('vmware-query')).toHaveTextContent('custom-prefix-:custom-tag:1') })
  })

  it('restores a saved snapshot after a refresh', async () => {
    const firstView = render(<VirtualMachineSearchParamsState provider={sourceProvider} />, { wrapper: wrapperFor() })
    await waitFor(() => { expect(screen.getByTestId('vmware-initialized')).toHaveTextContent('true') })
    fireEvent.click(screen.getByRole('button', { name: 'Use custom filters' }))
    firstView.unmount()

    render(<VirtualMachineSearchParamsState provider={sourceProvider} />, { wrapper: wrapperFor() })
    await waitFor(() => { expect(screen.getByTestId('vmware-query')).toHaveTextContent('custom-prefix-:custom-tag:1') })
  })

  it('keeps an explicitly cleared snapshot empty after a remount', async () => {
    const firstView = render(<VirtualMachineSearchParamsState provider={sourceProvider} />, { wrapper: wrapperFor() })
    await waitFor(() => { expect(screen.getByTestId('vmware-initialized')).toHaveTextContent('true') })
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    await waitFor(() => {
      expect(readProviderFilterSnapshot(providerScope(sourceProvider))?.filters).toEqual({
        search: '', powerState: '', connectionState: '', cluster: '', tags: [], untagged: false,
      })
    })
    firstView.unmount()

    render(<VirtualMachineSearchParamsState provider={sourceProvider} />, { wrapper: wrapperFor() })
    await waitFor(() => { expect(screen.getByTestId('vmware-query')).toHaveTextContent('::1') })
  })

  it('isolates source and target snapshots that share a provider ID', async () => {
    const sourceView = render(<VirtualMachineSearchParamsState provider={sourceProvider} />, { wrapper: wrapperFor() })
    await waitFor(() => { expect(screen.getByTestId('vmware-initialized')).toHaveTextContent('true') })
    fireEvent.click(screen.getByRole('button', { name: 'Use custom filters' }))
    sourceView.unmount()

    const targetProvider = { ...sourceProvider, role: 'target' as const, vmPrefix: 'target-prefix-', vmTags: ['target-tag'] }
    const targetView = render(<VirtualMachineSearchParamsState provider={targetProvider} />, { wrapper: wrapperFor() })
    await waitFor(() => { expect(screen.getByTestId('vmware-query')).toHaveTextContent('target-prefix-:target-tag:1') })
    targetView.unmount()

    render(<VirtualMachineSearchParamsState provider={sourceProvider} />, { wrapper: wrapperFor() })
    await waitFor(() => { expect(screen.getByTestId('vmware-query')).toHaveTextContent('custom-prefix-:custom-tag:1') })
  })

  it('persists filter changes but excludes pagination from the snapshot', async () => {
    render(<VirtualMachineSearchParamsState provider={sourceProvider} />, { wrapper: wrapperFor() })
    await waitFor(() => { expect(screen.getByTestId('vmware-initialized')).toHaveTextContent('true') })
    fireEvent.click(screen.getByRole('button', { name: 'Use custom filters' }))
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Go to page 3' })) })

    await waitFor(() => { expect(screen.getByTestId('vmware-query')).toHaveTextContent('custom-prefix-:custom-tag:3') })
    expect(readProviderFilterSnapshot(providerScope(sourceProvider))?.filters).toEqual({
      search: 'custom-prefix-', powerState: 'poweredOn', connectionState: '', cluster: '', tags: ['custom-tag'], untagged: false,
    })
  })

  it('parses valid values and falls back for invalid pagination', () => {
    const { result } = renderHook(() => useVirtualMachineSearchParams(), {
      wrapper: wrapperFor('/?page=-2&pageSize=99&tags=prod,db&untagged=true&providerId=null'),
    })

    expect(result.current.query).toMatchObject({
      page: 1,
      pageSize: 10,
      tags: ['prod'],
      untagged: true,
    })
  })

  it('updates filters and resets the page', () => {
    const { result } = renderHook(() => useVirtualMachineSearchParams(), { wrapper: wrapperFor('/?page=3') })

    act(() => {
      result.current.updateFilters({
        search: 'db', powerState: '', connectionState: '', cluster: '', tags: [], untagged: false,
      })
    })

    expect(result.current.query.page).toBe(1)
    expect(result.current.query.search).toBe('db')
  })

  it('writes normalized page and page size when filters reset pagination', () => {
    const { result } = renderHook(() => {
      const state = useVirtualMachineSearchParams()
      const location = useLocation()
      return { ...state, locationSearch: location.search }
    }, { wrapper: wrapperFor('/?page=3&pageSize=25') })

    act(() => {
      result.current.updateFilters({
        search: 'db', powerState: '', connectionState: '', cluster: '', tags: [], untagged: false,
      })
    })

    const params = new URLSearchParams(result.current.locationSearch)
    expect(params.get('page')).toBe('1')
    expect(params.get('pageSize')).toBe('25')
  })
})
