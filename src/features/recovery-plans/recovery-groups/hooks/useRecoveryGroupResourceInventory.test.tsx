import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'
import { fetchFlashSystemInventory } from '@/features/discovery-inventory/resources/api/flashSystemInventoryApi'
import { fetchPowerInventory } from '@/features/discovery-inventory/resources/api/powerInventoryApi'
import { fetchVmwareInventory } from '@/features/discovery-inventory/resources/api/vmwareInventoryApi'
import { discoveryInventoryKeys } from '@/features/discovery-inventory/resources/api/resourceInventoryQueryKeys'
import type {
  DiscoveredVirtualMachine,
  FlashSystemVolumeResource,
  PowerPartitionResource,
} from '@/features/discovery-inventory/resources/model/discoveryTypes'
import { useRecoveryGroupResourceInventory } from './useRecoveryGroupResourceInventory'

vi.mock('@/features/discovery-inventory/resources/api/flashSystemInventoryApi', () => ({
  fetchFlashSystemInventory: vi.fn(),
}))
vi.mock('@/features/discovery-inventory/resources/api/powerInventoryApi', () => ({
  fetchPowerInventory: vi.fn(),
}))
vi.mock('@/features/discovery-inventory/resources/api/vmwareInventoryApi', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/discovery-inventory/resources/api/vmwareInventoryApi')>(),
  fetchVmwareInventory: vi.fn(),
}))

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false } },
  })
}

function createWrapper(queryClient = createQueryClient()) {

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
      expect(fetchVmwareInventory).toHaveBeenCalledWith({ providerId })
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

  it('keeps VMware recovery data stable across rerenders without new inventory data', async () => {
    const { result, rerender } = renderHook(
      ({ prefix }: { prefix: string }) => useRecoveryGroupResourceInventory(
        'vmware_virtual_machines',
        'vmware-1',
        { vmwareNamePrefix: prefix },
      ),
      { wrapper: createWrapper(), initialProps: { prefix: '' } },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    const initialData = result.current.data
    const initialMetadata = result.current.data?.vmMetadataByName

    rerender({ prefix: '' })

    expect(result.current.data).toBe(initialData)
    expect(result.current.data?.vmMetadataByName).toBe(initialMetadata)
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

  it('uses the canonical VMware inventory lifecycle for a name prefix', async () => {
    const { result } = renderHook(
      () => useRecoveryGroupResourceInventory('vmware_virtual_machines', 'vmware-1', {
        vmwareNamePrefix: 'WEB',
      }),
      { wrapper: createWrapper() },
    )

    expect(fetchVmwareInventory).not.toHaveBeenCalled()

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) }, { timeout: 1_000 })

    expect(fetchVmwareInventory).toHaveBeenCalledWith({
      providerId: 'vmware-1',
      namePrefix: 'WEB',
    })
  })

  it('reports searching while a VMware name prefix debounces and then fetches', async () => {
    const { result } = renderHook(
      () => useRecoveryGroupResourceInventory('vmware_virtual_machines', 'vmware-1', {
        vmwareNamePrefix: 'WEB',
      }),
      { wrapper: createWrapper() },
    )

    expect(result.current.isSearching).toBe(true)

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) }, { timeout: 1_000 })

    expect(result.current.isSearching).toBe(false)
  })

  it('keeps searching true while a new prefix request replaces already visible data', async () => {
    const { result, rerender } = renderHook(
      ({ prefix }: { prefix: string }) => useRecoveryGroupResourceInventory(
        'vmware_virtual_machines',
        'vmware-1',
        { vmwareNamePrefix: prefix },
      ),
      { wrapper: createWrapper(), initialProps: { prefix: '' } },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(result.current.isSearching).toBe(false)

    let resolveSearch: ((inventory: { reportedCount: number; virtualMachines: DiscoveredVirtualMachine[] }) => void) | undefined
    vi.mocked(fetchVmwareInventory).mockImplementation(
      () => new Promise((resolve) => { resolveSearch = resolve }),
    )
    rerender({ prefix: 'WEB' })

    expect(result.current.isSearching).toBe(true)

    await waitFor(() => {
      expect(fetchVmwareInventory).toHaveBeenCalledWith({ providerId: 'vmware-1', namePrefix: 'WEB' })
    }, { timeout: 1_000 })

    expect(result.current.isSearching).toBe(true)
    expect(result.current.data?.resourceNames).toEqual(['VM-01', 'VM-02'])

    resolveSearch?.({ reportedCount: 1, virtualMachines: [{ name: 'WEB-01' } as DiscoveredVirtualMachine] })

    await waitFor(() => { expect(result.current.isSearching).toBe(false) })
    expect(result.current.data?.resourceNames).toEqual(['WEB-01'])
  })

  it.each([
    ['ibm_power_virtual_machines', 'power-1'],
    ['ibm_flashsystem', 'flash-1'],
  ] as const)('never reports searching for locally filtered %s', async (workloadType, providerId) => {
    const { result } = renderHook(
      () => useRecoveryGroupResourceInventory(workloadType, providerId),
      { wrapper: createWrapper() },
    )

    expect(result.current.isSearching).toBe(false)

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(result.current.isSearching).toBe(false)
  })

  it.each([
    [
      'vmware_virtual_machines',
      'vmware-1',
      discoveryInventoryKeys.vmwareSearch({ providerId: 'vmware-1' }),
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
    const queryClient = createQueryClient()
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
