import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'
import {
  flashSystemInventoryQuery,
  powerInventoryQuery,
  vmwareInventoryQuery,
} from '@/features/discovery-inventory/resources/model/inventoryQueries'
import { VmsResponse, VolumesResponse } from '@/generated/query/zod'
import { parseWireResponse } from '@/test-utils/parseWireResponse'
import {
  createDiscoveryFetchHandlers,
  installDiscoveryFetch,
} from '@/features/discovery-inventory/resources/test/discoveryFetch'
import { useRecoveryGroupResourceInventory } from './useRecoveryGroupResourceInventory'

const discoveryFetch = createDiscoveryFetchHandlers()
const { fetchFlashSystemInventory, fetchPowerInventory, fetchVmwareInventory } = discoveryFetch

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
    installDiscoveryFetch(discoveryFetch)
    fetchVmwareInventory.mockReturnValue({ count: 2, vms: [{ name: 'VM-01' }, { name: 'VM-02' }] })
    fetchPowerInventory.mockReturnValue({
      count: 1,
      counts_by_type: { LogicalPartition: 1, VirtualIOServer: 0 },
      vms: [{ lpar: { PartitionName: 'LPAR-01' }, vios: {} }],
    })
    fetchFlashSystemInventory.mockReturnValue({
      count: 1, volumes: [{ name: 'VOL-01' }], pools: {}, hosts: {}, clusters: {}, consistency_groups: {},
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
    fetchVmwareInventory.mockReturnValue({
      count: 1,
      vms: [{
        name: 'db-vm-01',
        guest_hostname: 'db01.sampleapp.local',
        ip_address: '192.168.10.11',
        guest_os: 'Ubuntu 22.04',
        vcpu: 4,
        memory_gb: 16,
        vdisks: [
          { uuid: '1', label: 'Hard disk 1', capacity_gb: 150, datastore: 'ds1', file: 'x', thin_provisioned: true },
          { uuid: '2', label: 'Hard disk 2', capacity_gb: 50, datastore: 'ds1', file: 'y', thin_provisioned: true },
        ],
      }],
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

    fetchPowerInventory.mockReturnValue({
      count: 2,
      counts_by_type: { LogicalPartition: 2, VirtualIOServer: 0 },
      vms: [
        { lpar: { PartitionName: 'LPAR-01', OperatingSystemType: 'AIX' }, vios: {} },
        { lpar: { PartitionName: 'LPAR-02', OperatingSystemType: '' }, vios: {} },
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

    let resolveSearch: ((response: unknown) => void) | undefined
    fetchVmwareInventory.mockImplementation(
      () => new Promise((resolve) => { resolveSearch = resolve }),
    )
    rerender({ prefix: 'WEB' })

    expect(result.current.isSearching).toBe(true)

    await waitFor(() => {
      expect(fetchVmwareInventory).toHaveBeenCalledWith({ providerId: 'vmware-1', namePrefix: 'WEB' })
    }, { timeout: 1_000 })

    expect(result.current.isSearching).toBe(true)
    expect(result.current.data?.resourceNames).toEqual(['VM-01', 'VM-02'])

    resolveSearch?.({ count: 1, vms: [{ name: 'WEB-01' }] })

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
      vmwareInventoryQuery({ providerId: 'vmware-1' }).queryKey,
      parseWireResponse(VmsResponse, { count: 1, vms: [{ name: 'CACHED-VM' }] }),
      ['CACHED-VM'],
    ],
    [
      'ibm_power_virtual_machines',
      'power-1',
      powerInventoryQuery('power-1').queryKey,
      {
        count: 1,
        counts_by_type: { LogicalPartition: 1, VirtualIOServer: 0 },
        vms: [{ lpar: { PartitionName: 'CACHED-LPAR' }, vios: {} }],
      },
      ['CACHED-LPAR'],
    ],
    [
      'ibm_flashsystem',
      'flash-1',
      flashSystemInventoryQuery('flash-1').queryKey,
      parseWireResponse(VolumesResponse, { count: 1, volumes: [{ name: 'CACHED-VOL' }], pools: {}, hosts: {}, clusters: {}, consistency_groups: {} }),
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
