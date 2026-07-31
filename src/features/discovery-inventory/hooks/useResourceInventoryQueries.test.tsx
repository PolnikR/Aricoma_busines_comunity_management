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

  it('fetches only providers for the active source with canonical cache keys', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(
      () => useResourceInventoryQueries('flashsystem', [flashProvider, powerProvider]),
      { wrapper },
    )

    await waitFor(() => { expect(result.current.isLoading).toBe(false) })
    expect(fetchFlashSystemInventory).toHaveBeenCalledWith('flash-01')
    expect(fetchPowerInventory).not.toHaveBeenCalled()
    expect(client.getQueryCache().find({ queryKey: ['resource-inventory', 'FLASHCOPY', 'flash-01'] })).toBeDefined()
    expect(client.getQueryCache().find({ queryKey: ['resource-inventory', 'IBM_POWER', 'power-01'] })).toBeUndefined()
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
    expect(client.getQueryCache().getAll()).toHaveLength(0)
  })
})
