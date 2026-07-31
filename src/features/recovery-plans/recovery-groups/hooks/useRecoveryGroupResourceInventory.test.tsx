import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchFlashSystemInventory,
  fetchPowerInventory,
  fetchVmwareInventory,
} from '@/features/discovery-inventory/api/discoveryInventoryApi'
import type {
  DiscoveredVirtualMachine,
  FlashSystemVolumeResource,
  PowerPartitionResource,
} from '@/features/discovery-inventory/model/discoveryTypes'
import { useRecoveryGroupResourceInventory } from './useRecoveryGroupResourceInventory'

vi.mock('@/features/discovery-inventory/api/discoveryInventoryApi', () => ({
  fetchVmwareInventory: vi.fn(),
  fetchPowerInventory: vi.fn(),
  fetchFlashSystemInventory: vi.fn(),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useRecoveryGroupResourceInventory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchVmwareInventory).mockResolvedValue({
      reportedCount: 2,
      virtualMachines: [
        { name: 'VM-01' } as DiscoveredVirtualMachine,
        { name: 'VM-02' } as DiscoveredVirtualMachine,
      ],
    })
    vi.mocked(fetchPowerInventory).mockResolvedValue({
      reportedCount: 1,
      countsByType: { LogicalPartition: 1, VirtualIOServer: 0 },
      virtualMachines: [],
      partitions: [{ partitionName: 'LPAR-01' } as PowerPartitionResource],
    })
    vi.mocked(fetchFlashSystemInventory).mockResolvedValue({
      reportedCount: 1,
      volumes: [],
      resources: [{ name: 'VOL-01' } as FlashSystemVolumeResource],
      pools: {},
      hosts: {},
      clusters: {},
    })
  })

  it.each([
    ['vmware_virtual_machines', 'vmware-1', ['VM-01', 'VM-02']],
    ['ibm_power_virtual_machines', 'power-1', ['LPAR-01']],
    ['ibm_flashsystem', 'flash-1', ['VOL-01']],
  ] as const)('loads %s resources from the selected provider', async (
    workloadType,
    providerId,
    expectedNames,
  ) => {
    const { result } = renderHook(
      () => useRecoveryGroupResourceInventory(workloadType, providerId),
      { wrapper: createWrapper() },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(result.current.data?.resourceNames).toEqual(expectedNames)

    if (workloadType === 'vmware_virtual_machines') {
      expect(fetchVmwareInventory).toHaveBeenCalledWith(providerId)
    } else if (workloadType === 'ibm_power_virtual_machines') {
      expect(fetchPowerInventory).toHaveBeenCalledWith(providerId)
    } else {
      expect(fetchFlashSystemInventory).toHaveBeenCalledWith(providerId)
    }
  })

  it('does not request inventory until a provider is selected', () => {
    const { result } = renderHook(
      () => useRecoveryGroupResourceInventory('vmware_virtual_machines', null),
      { wrapper: createWrapper() },
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchVmwareInventory).not.toHaveBeenCalled()
    expect(fetchPowerInventory).not.toHaveBeenCalled()
    expect(fetchFlashSystemInventory).not.toHaveBeenCalled()
  })
})
