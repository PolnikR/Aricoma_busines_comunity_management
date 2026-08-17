import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { fetchFlashSystemInventory, fetchPowerInventory } from '../api/discoveryInventoryApi'
import { useResourceInventoryQueries } from './useResourceInventoryQueries'

vi.mock('../api/discoveryInventoryApi', () => ({
  fetchFlashSystemInventory: vi.fn(),
  fetchPowerInventory: vi.fn(),
}))

const flashProvider: ProviderRecord = {
  id: 'flash-01', name: 'Flash 01', description: '', type: 'FLASHCOPY',
  ipAddress: '10.0.0.1', credentialId: null, credentialStatus: 'none',
}
const powerProvider: ProviderRecord = {
  id: 'power-01', name: 'Power 01', description: '', type: 'IBM_POWER',
  ipAddress: '10.0.0.2', credentialId: null, credentialStatus: 'none',
}
const secondFlashProvider: ProviderRecord = {
  ...flashProvider,
  id: 'flash-02',
  name: 'Flash 02',
}

describe('useResourceInventoryQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchFlashSystemInventory).mockResolvedValue({
      reportedCount: 0, volumes: [], resources: [], pools: {}, hosts: {}, clusters: {},
    })
    vi.mocked(fetchPowerInventory).mockResolvedValue({
      reportedCount: 0,
      countsByType: { LogicalPartition: 0, VirtualIOServer: 0 },
      virtualMachines: [],
      partitions: [],
    })
  })

  it('fetches all resources without provider_id and uses the all-provider cache key', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(
      () => useResourceInventoryQueries(
        'flashsystem',
        [flashProvider, secondFlashProvider, powerProvider],
      ),
      { wrapper },
    )

    await waitFor(() => { expect(result.current.isLoading).toBe(false) })
    expect(fetchFlashSystemInventory).toHaveBeenCalledTimes(1)
    expect(fetchFlashSystemInventory).toHaveBeenCalledWith(undefined)
    expect(fetchPowerInventory).not.toHaveBeenCalled()
    expect(client.getQueryCache().find({
      queryKey: ['resource-inventory', 'FLASHCOPY', null],
    })).toBeDefined()
  })

  it('runs no inventory request until an active source and fetched providers are supplied', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(
      () => useResourceInventoryQueries(null, []),
      { wrapper },
    )

    expect(result.current.isLoading).toBe(false)
    expect(fetchFlashSystemInventory).not.toHaveBeenCalled()
    expect(fetchPowerInventory).not.toHaveBeenCalled()
  })

  it('fetches a selected provider server-side and reuses both cache scopes', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    let providerId: string | undefined
    const { result, rerender } = renderHook(
      () => useResourceInventoryQueries('flashsystem', [flashProvider, powerProvider], providerId),
      { wrapper },
    )

    await waitFor(() => { expect(result.current.isLoading).toBe(false) })
    expect(fetchFlashSystemInventory).toHaveBeenCalledTimes(1)
    expect(fetchFlashSystemInventory).toHaveBeenLastCalledWith(undefined)

    providerId = 'flash-01'
    rerender()
    await waitFor(() => { expect(fetchFlashSystemInventory).toHaveBeenCalledTimes(2) })
    expect(fetchFlashSystemInventory).toHaveBeenLastCalledWith('flash-01')
    expect(client.getQueryCache().find({
      queryKey: ['resource-inventory', 'FLASHCOPY', 'flash-01'],
    })).toBeDefined()

    providerId = undefined
    rerender()
    await waitFor(() => { expect(result.current.isLoading).toBe(false) })
    expect(fetchFlashSystemInventory).toHaveBeenCalledTimes(2)
  })

  it('reports an aggregate request failure for all providers of the active source', async () => {
    vi.mocked(fetchFlashSystemInventory).mockRejectedValue(new Error('inventory unavailable'))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(
      () => useResourceInventoryQueries('flashsystem', [flashProvider, secondFlashProvider]),
      { wrapper },
    )

    await waitFor(() => { expect(result.current.failures).toHaveLength(2) }, { timeout: 3_000 })
    expect(result.current.flashSystemInventories).toHaveLength(0)
    expect(result.current.failures.map(({ provider }) => provider.id)).toEqual(['flash-01', 'flash-02'])
  })

  it('attributes a provider-scoped request failure only to the selected provider', async () => {
    vi.mocked(fetchFlashSystemInventory).mockRejectedValue(new Error('provider unavailable'))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(
      () => useResourceInventoryQueries(
        'flashsystem',
        [flashProvider, secondFlashProvider],
        'flash-02',
      ),
      { wrapper },
    )

    await waitFor(() => { expect(result.current.failures).toHaveLength(1) }, { timeout: 3_000 })
    expect(result.current.failures[0]?.provider.id).toBe('flash-02')
  })
})
