import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
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
import type { RecoveryGroupProviderScope } from '../model/recoveryGroupTypes'
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
      () => useRecoveryGroupResourceInventory(workloadType, providerId, { providerScope: null }),
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
      () => useRecoveryGroupResourceInventory('vmware_virtual_machines', 'vmware-1', { providerScope: null }),
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
      () => useRecoveryGroupResourceInventory('ibm_power_virtual_machines', 'power-1', { providerScope: null }),
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
      ({ providerScope }: { providerScope: RecoveryGroupProviderScope }) => useRecoveryGroupResourceInventory(
        'vmware_virtual_machines',
        'vmware-1',
        { providerScope },
      ),
      { wrapper: createWrapper(), initialProps: { providerScope: { vmPrefix: null, vmTags: [] } } },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    const initialData = result.current.data
    const initialMetadata = result.current.data?.vmMetadataByName

    rerender({ providerScope: { vmPrefix: null, vmTags: [] } })

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

  it.each([
    ['no scope', null, { providerId: 'vmware-1' }],
    ['a name prefix', { vmPrefix: ' TEST- ' }, { providerId: 'vmware-1', namePrefix: 'TEST-' }],
    ['a tag', { vmTags: [' WEB '] }, { providerId: 'vmware-1', tag: 'WEB' }],
    ['a prefix and tags', { vmPrefix: ' TEST- ', vmTags: [' ', ' WEB ', 'DB'] }, { providerId: 'vmware-1', namePrefix: 'TEST-', tag: 'WEB' }],
  ] as const)('requests VMware inventory with the provider scope for %s on the canonical key', async (
    _,
    providerScope,
    expectedSearch,
  ) => {
    const queryClient = createQueryClient()
    const { result } = renderHook(
      () => useRecoveryGroupResourceInventory('vmware_virtual_machines', 'vmware-1', { providerScope }),
      { wrapper: createWrapper(queryClient) },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) }, { timeout: 1_000 })

    expect(fetchVmwareInventory).toHaveBeenCalledTimes(1)
    expect(fetchVmwareInventory).toHaveBeenCalledWith(expectedSearch)
    expect(queryClient.getQueryData(vmwareInventoryQuery(expectedSearch).queryKey)).toBeDefined()
  })

  it.each([
    ['vmware_virtual_machines', 'vmware-1'],
    ['ibm_power_virtual_machines', 'power-1'],
  ] as const)('does not request %s inventory while the provider scope is unknown', (workloadType, providerId) => {
    const { result } = renderHook(
      () => useRecoveryGroupResourceInventory(workloadType, providerId),
      { wrapper: createWrapper() },
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchVmwareInventory).not.toHaveBeenCalled()
    expect(fetchPowerInventory).not.toHaveBeenCalled()
  })

  it('loads FlashSystem volumes without a provider scope', async () => {
    const { result } = renderHook(
      () => useRecoveryGroupResourceInventory('ibm_flashsystem', 'flash-1'),
      { wrapper: createWrapper() },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(result.current.data?.resourceNames).toEqual(['VOL-01'])
  })

  describe('VMware user search', () => {
    const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 400)) })

    function renderVmware(providerScope: RecoveryGroupProviderScope | null, queryClient = createQueryClient()) {
      return renderHook(
        ({ prefix }: { prefix: string }) => useRecoveryGroupResourceInventory('vmware_virtual_machines', 'vmware-1', {
          providerScope,
          vmwareNamePrefix: prefix,
        }),
        { wrapper: createWrapper(queryClient), initialProps: { prefix: '' } },
      )
    }

    it.each([
      ['a fixed prefix', { vmPrefix: 'TEST-' }, { providerId: 'vmware-1', namePrefix: 'TEST-' }],
      ['a fixed tag only', { vmPrefix: null, vmTags: ['WEB'] }, { providerId: 'vmware-1', tag: 'WEB' }],
      ['a fixed prefix and tag', { vmPrefix: 'TEST-', vmTags: ['WEB'] }, { providerId: 'vmware-1', namePrefix: 'TEST-', tag: 'WEB' }],
    ] as const)('never sends the user search for %s', async (_, providerScope, expectedSearch) => {
      const { result, rerender } = renderVmware(providerScope)
      await waitFor(() => { expect(result.current.isSuccess).toBe(true) }, { timeout: 1_000 })

      rerender({ prefix: 'DB' })
      await settle()

      expect(fetchVmwareInventory).toHaveBeenCalledTimes(1)
      expect(fetchVmwareInventory).toHaveBeenCalledWith(expectedSearch)
      expect(result.current.isSearching).toBe(false)
    })

    it('sends only the settled user search to the server when the provider has no scope', async () => {
      const queryClient = createQueryClient()
      const { result, rerender } = renderVmware(null, queryClient)
      await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
      expect(fetchVmwareInventory).toHaveBeenCalledWith({ providerId: 'vmware-1' })

      rerender({ prefix: 'P' })
      rerender({ prefix: 'PR' })
      rerender({ prefix: 'PROD-' })
      expect(result.current.isSearching).toBe(true)

      await waitFor(() => {
        expect(fetchVmwareInventory).toHaveBeenCalledWith({ providerId: 'vmware-1', namePrefix: 'PROD-' })
      }, { timeout: 1_000 })
      await waitFor(() => { expect(result.current.isSearching).toBe(false) })
      expect(fetchVmwareInventory).toHaveBeenCalledTimes(2)
      expect(queryClient.getQueryData(vmwareInventoryQuery({ providerId: 'vmware-1', namePrefix: 'PROD-' }).queryKey)).toBeDefined()
    })

    it('returns to the provider-only query when an unscoped search is cleared', async () => {
      const queryClient = createQueryClient()
      const { result, rerender } = renderVmware(null, queryClient)
      await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
      fetchVmwareInventory.mockReturnValue({ count: 1, vms: [{ name: 'PROD-01' }] })
      rerender({ prefix: 'PROD-' })
      await waitFor(() => { expect(result.current.data?.resourceNames).toEqual(['PROD-01']) }, { timeout: 1_000 })

      rerender({ prefix: '' })

      await waitFor(() => { expect(result.current.data?.resourceNames).toEqual(['VM-01', 'VM-02']) })
      expect(queryClient.getQueryData(vmwareInventoryQuery({ providerId: 'vmware-1' }).queryKey)).toBeDefined()
      for (const [search] of fetchVmwareInventory.mock.calls) {
        expect([{ providerId: 'vmware-1' }, { providerId: 'vmware-1', namePrefix: 'PROD-' }]).toContainEqual(search)
      }
    })
  })

  describe('IBM Power provider scope', () => {
    beforeEach(() => {
      fetchPowerInventory.mockReturnValue({
        count: 3,
        counts_by_type: { LogicalPartition: 3, VirtualIOServer: 0 },
        vms: [
          { lpar: { PartitionName: 'TEST-AIX-01', OperatingSystemType: 'AIX' }, vios: {} },
          { lpar: { PartitionName: 'TEST-AIX-02', OperatingSystemType: 'AIX' }, vios: {} },
          { lpar: { PartitionName: 'PROD-AIX-01', OperatingSystemType: 'AIX' }, vios: {} },
        ],
      })
    })

    function renderPower(providerScope: RecoveryGroupProviderScope | null, queryClient = createQueryClient()) {
      return renderHook(
        () => useRecoveryGroupResourceInventory('ibm_power_virtual_machines', 'power-1', { providerScope }),
        { wrapper: createWrapper(queryClient) },
      )
    }

    it('keeps only partitions whose name starts with the trimmed prefix, metadata included', async () => {
      const queryClient = createQueryClient()
      const { result } = renderPower({ vmPrefix: ' TEST- ' }, queryClient)

      await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
      expect(result.current.data?.resourceNames).toEqual(['TEST-AIX-01', 'TEST-AIX-02'])
      expect(result.current.data?.vmMetadataByName).toEqual({
        'TEST-AIX-01': { os: 'AIX' },
        'TEST-AIX-02': { os: 'AIX' },
      })
      expect(fetchPowerInventory).toHaveBeenCalledWith('power-1')
      expect(queryClient.getQueryData(powerInventoryQuery('power-1').queryKey)).toBeDefined()
    })

    it('matches the prefix at the start of the name only', async () => {
      const { result } = renderPower({ vmPrefix: 'AIX' })

      await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
      expect(result.current.data?.resourceNames).toEqual([])
    })

    it.each([
      ['no scope', null],
      ['a blank prefix', { vmPrefix: '   ' }],
      ['tags only, which the Power inventory cannot enforce', { vmPrefix: null, vmTags: ['WEB'] }],
    ] as const)('keeps every partition for %s', async (_, providerScope) => {
      const { result } = renderPower(providerScope)

      await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
      expect(result.current.data?.resourceNames).toEqual(['TEST-AIX-01', 'TEST-AIX-02', 'PROD-AIX-01'])
    })
  })

  it.each([
    ['ibm_power_virtual_machines', 'power-1'],
    ['ibm_flashsystem', 'flash-1'],
  ] as const)('never reports searching for locally filtered %s', async (workloadType, providerId) => {
    const { result } = renderHook(
      () => useRecoveryGroupResourceInventory(workloadType, providerId, { providerScope: null }),
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
      () => useRecoveryGroupResourceInventory(workloadType, providerId, { providerScope: null }),
      { wrapper: createWrapper(queryClient) },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(result.current.data?.resourceNames).toEqual(expectedNames)
    expect(fetchVmwareInventory).not.toHaveBeenCalled()
    expect(fetchPowerInventory).not.toHaveBeenCalled()
    expect(fetchFlashSystemInventory).not.toHaveBeenCalled()
  })
})
