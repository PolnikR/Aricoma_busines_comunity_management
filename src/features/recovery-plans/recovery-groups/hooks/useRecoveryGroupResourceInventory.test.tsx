import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchFlashSystemInventory,
  fetchPowerInventory,
  fetchVmwareInventory,
} from '@/features/discovery-inventory/api/discoveryInventoryApi'
import { discoveryInventoryKeys } from '@/features/discovery-inventory/api/discoveryInventoryQueryKeys'
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

function createWrapper(queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })) {

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

  it('extracts VM metadata for vmware and IBM Power workloads', async () => {
    vi.mocked(fetchVmwareInventory).mockResolvedValue({
      reportedCount: 1,
      virtualMachines: [{
        name: 'db-vm-01',
        hostname: 'db01.sampleapp.local',
        ipAddress: '192.168.10.11',
        guestOs: 'Ubuntu 22.04',
        vcpu: 4,
        memoryGb: 16,
        disks: [
          { id: '1', label: 'Hard disk 1', capacityGb: 150, datastore: 'ds1', filePath: 'x', thinProvisioned: true },
          { id: '2', label: 'Hard disk 2', capacityGb: 50, datastore: 'ds1', filePath: 'y', thinProvisioned: true },
        ],
      } as DiscoveredVirtualMachine],
    })

    const { result } = renderHook(
      () => useRecoveryGroupResourceInventory('vmware_virtual_machines', 'vmware-1'),
      { wrapper: createWrapper() },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(result.current.data?.vmMetadataByName['db-vm-01']).toEqual({
      hostname: 'db01.sampleapp.local',
      ip_address: '192.168.10.11',
      os: 'Ubuntu 22.04',
      cpu: 4,
      memory_gb: 16,
      storage_gb: 200,
    })

    vi.mocked(fetchPowerInventory).mockResolvedValue({
      reportedCount: 1,
      countsByType: { LogicalPartition: 1, VirtualIOServer: 0 },
      virtualMachines: [],
      partitions: [
        { partitionName: 'LPAR-01', operatingSystemType: 'AIX' } as PowerPartitionResource,
        { partitionName: 'LPAR-02', operatingSystemType: '' } as PowerPartitionResource,
      ],
    })

    const { result: powerResult } = renderHook(
      () => useRecoveryGroupResourceInventory('ibm_power_virtual_machines', 'power-1'),
      { wrapper: createWrapper() },
    )
    await waitFor(() => { expect(powerResult.current.isSuccess).toBe(true) })
    expect(powerResult.current.data?.vmMetadataByName).toEqual({
      'LPAR-01': { os: 'AIX' },
      'LPAR-02': {},
    })
  })

  it('does not extract VM metadata for ibm_flashsystem', async () => {
    const { result } = renderHook(
      () => useRecoveryGroupResourceInventory('ibm_flashsystem', 'flash-1'),
      { wrapper: createWrapper() },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(result.current.data?.vmMetadataByName).toEqual({})
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

  it.each([
    [
      'vmware_virtual_machines',
      'vmware-1',
      discoveryInventoryKeys.inventory('vmware-1'),
      {
        reportedCount: 1,
        virtualMachines: [{ name: 'CACHED-VM' } as DiscoveredVirtualMachine],
      },
      ['CACHED-VM'],
    ],
    [
      'ibm_power_virtual_machines',
      'power-1',
      discoveryInventoryKeys.resourceInventory('IBM_POWER', 'power-1'),
      {
        reportedCount: 1,
        countsByType: { LogicalPartition: 1, VirtualIOServer: 0 },
        virtualMachines: [],
        partitions: [{ partitionName: 'CACHED-LPAR' } as PowerPartitionResource],
      },
      ['CACHED-LPAR'],
    ],
    [
      'ibm_flashsystem',
      'flash-1',
      discoveryInventoryKeys.resourceInventory('FLASHCOPY', 'flash-1'),
      {
        reportedCount: 1,
        volumes: [],
        resources: [{ name: 'CACHED-VOL' } as FlashSystemVolumeResource],
        pools: {},
        hosts: {},
        clusters: {},
      },
      ['CACHED-VOL'],
    ],
  ] as const)('reuses the discovery cache for %s', async (
    workloadType,
    providerId,
    queryKey,
    inventory,
    expectedNames,
  ) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(queryKey, inventory)

    const { result } = renderHook(
      () => useRecoveryGroupResourceInventory(workloadType, providerId),
      { wrapper: createWrapper(queryClient) },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(result.current.data?.resourceNames).toEqual(expectedNames)
    expect(fetchVmwareInventory).not.toHaveBeenCalled()
    expect(fetchPowerInventory).not.toHaveBeenCalled()
    expect(fetchFlashSystemInventory).not.toHaveBeenCalled()
  })
})
