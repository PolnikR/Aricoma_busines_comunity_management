import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { fetchFlashSystemInventory } from '../api/flashSystemInventoryApi'
import { fetchPowerInventory } from '../api/powerInventoryApi'
import { useResourceInventoryQueries } from './useResourceInventoryQueries'

vi.mock('../api/flashSystemInventoryApi', () => ({
  fetchFlashSystemInventory: vi.fn(),
}))
vi.mock('../api/powerInventoryApi', () => ({
  fetchPowerInventory: vi.fn(),
}))

const flashProvider: ProviderRecord = {
  id: 'flash-01', name: 'Flash 01', description: '', type: 'FLASHCOPY',
  ipAddress: '10.0.0.1', port: 22, credentialId: null, credentialStatus: 'none',
}
const powerProvider: ProviderRecord = {
  id: 'power-01', name: 'Power 01', description: '', type: 'IBM_POWER',
  ipAddress: '10.0.0.2', port: 22, credentialId: null, credentialStatus: 'none',
}
const secondFlashProvider: ProviderRecord = {
  ...flashProvider,
  id: 'flash-02',
  name: 'Flash 02',
}
const targetFlashProvider: ProviderRecord = {
  ...flashProvider,
  id: 'flash-target-01',
  name: 'Flash Target',
  role: 'target',
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false } },
  })
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
    const client = createQueryClient()
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
    const client = createQueryClient()
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
    const client = createQueryClient()
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
    const client = createQueryClient()
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
    const client = createQueryClient()
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

  it('excludes target-role providers when filtering by type — no providers available when only target exists', () => {
    const client = createQueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(
      () => useResourceInventoryQueries('flashsystem', [targetFlashProvider]),
      { wrapper },
    )

    expect(result.current.hasProviders).toBe(false)
    expect(fetchFlashSystemInventory).not.toHaveBeenCalled()
  })

  it('restricts to target providers when role is "target"; restricts to source providers when role is "source" or omitted', async () => {
    // With role='target', only targets are available
    const clientTarget = createQueryClient()
    const wrapperTarget = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={clientTarget}>{children}</QueryClientProvider>
    )
    const { result: resultTarget } = renderHook(
      () => useResourceInventoryQueries('flashsystem', [flashProvider, targetFlashProvider], undefined, 'target'),
      { wrapper: wrapperTarget },
    )
    expect(resultTarget.current.hasProviders).toBe(true)
    await waitFor(() => { expect(resultTarget.current.isLoading).toBe(false) })
    expect(fetchFlashSystemInventory).toHaveBeenCalledWith(undefined)

    vi.clearAllMocks()

    // With role='source' (explicit), only sources are available
    const clientSource = createQueryClient()
    const wrapperSource = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={clientSource}>{children}</QueryClientProvider>
    )
    const { result: resultSource } = renderHook(
      () => useResourceInventoryQueries('flashsystem', [flashProvider, targetFlashProvider], undefined, 'source'),
      { wrapper: wrapperSource },
    )
    expect(resultSource.current.hasProviders).toBe(true)
    await waitFor(() => { expect(resultSource.current.isLoading).toBe(false) })
    expect(fetchFlashSystemInventory).toHaveBeenCalledWith(undefined)

    vi.clearAllMocks()

    // With role omitted (default), only sources are available
    const clientDefault = createQueryClient()
    const wrapperDefault = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={clientDefault}>{children}</QueryClientProvider>
    )
    const { result: resultDefault } = renderHook(
      () => useResourceInventoryQueries('flashsystem', [flashProvider, targetFlashProvider], undefined),
      { wrapper: wrapperDefault },
    )
    expect(resultDefault.current.hasProviders).toBe(true)
    await waitFor(() => { expect(resultDefault.current.isLoading).toBe(false) })
    expect(fetchFlashSystemInventory).toHaveBeenCalledWith(undefined)
  })
})
