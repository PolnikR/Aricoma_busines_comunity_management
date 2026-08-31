import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { fetchPowerInventory } from '../../resources/api/powerInventoryApi'
import { fetchVmwareInventory } from '../../resources/api/vmwareInventoryApi'
import { useInfrastructureInventory } from './useInfrastructureInventory'

vi.mock('../../resources/api/powerInventoryApi', () => ({
  fetchPowerInventory: vi.fn(),
}))
vi.mock('../../resources/api/vmwareInventoryApi', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../resources/api/vmwareInventoryApi')>(),
  fetchVmwareInventory: vi.fn(),
}))

function provider(type: ProviderRecord['type'], id: string): ProviderRecord {
  return { id, type, name: id, description: '', ipAddress: '', port: 22, credentialId: null, credentialStatus: 'ok' }
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchVmwareInventory).mockResolvedValue({ reportedCount: 0, virtualMachines: [] })
  vi.mocked(fetchPowerInventory).mockResolvedValue({
    reportedCount: 0,
    countsByType: { LogicalPartition: 0, VirtualIOServer: 0 },
    virtualMachines: [],
    partitions: [],
  })
})

describe('useInfrastructureInventory', () => {
  it('loads VMware inventory with the selected provider id', async () => {
    const selected = provider('VMWARE', 'vcenter-01')
    const { result } = renderHook(() => useInfrastructureInventory(selected), { wrapper })

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(fetchVmwareInventory).toHaveBeenCalledWith({ providerId: 'vcenter-01' })
    expect(fetchPowerInventory).not.toHaveBeenCalled()
  })

  it('loads IBM Power inventory with the selected provider id', async () => {
    const selected = provider('IBM_POWER', 'power-01')
    const { result } = renderHook(() => useInfrastructureInventory(selected), { wrapper })

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(fetchPowerInventory).toHaveBeenCalledWith('power-01')
    expect(fetchVmwareInventory).not.toHaveBeenCalled()
  })

  it('does not request inventory without a compatible provider', () => {
    const { result } = renderHook(() => useInfrastructureInventory(null), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchPowerInventory).not.toHaveBeenCalled()
    expect(fetchVmwareInventory).not.toHaveBeenCalled()
  })
})
