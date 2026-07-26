import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDiscoveryInventory } from '@/features/discovery-inventory/api/useDiscoveryInventory'
import { useVirtualMachinesUnified } from './useVirtualMachinesUnified'
import type { DiscoveryInventory } from '@/features/discovery-inventory/model/discoveryTypes'

vi.mock('@/features/discovery-inventory/api/useDiscoveryInventory', () => ({
  useDiscoveryInventory: vi.fn(),
}))

const inventory: DiscoveryInventory = {
  reportedCount: 1,
  virtualMachines: [{
    id: 'vm-1',
    name: 'application-01',
    powerState: 'poweredOn',
    connectionState: 'connected',
    guestOs: 'Linux',
    hostname: 'application-01',
    ipAddress: '10.0.0.1',
    vcpu: 2,
    memoryGb: 4,
    host: 'esx-01',
    cluster: 'cluster-01',
    primaryDatastore: 'datastore-01',
    folder: 'Applications',
    vmPath: '[datastore-01] application-01/application-01.vmx',
    providerId: 'vcenter-01',
    providerType: 'VMWARE',
    disks: [],
    snapshotCount: 0,
    toolsStatus: 'toolsOk',
    tags: [],
  }],
}

beforeEach(() => {
  vi.mocked(useDiscoveryInventory).mockReset()
})

describe('useVirtualMachinesUnified compatibility adapter', () => {
  it('derives the VM list and topology from one inventory query', () => {
    const refetch = vi.fn()
    vi.mocked(useDiscoveryInventory).mockReturnValue({
      data: inventory,
      error: null,
      isLoading: false,
      isFetching: false,
      refetch,
    } as unknown as ReturnType<typeof useDiscoveryInventory>)

    const { result } = renderHook(() => useVirtualMachinesUnified())

    expect(result.current.vmList?.virtualMachines[0]?.name).toBe('application-01')
    expect(result.current.topology?.nodes.some((node) => node.kind === 'virtualMachine')).toBe(true)
    result.current.refetch()
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('forwards loading and error state from the inventory query', () => {
    const error = new Error('Inventory unavailable')
    vi.mocked(useDiscoveryInventory).mockReturnValue({
      data: undefined,
      error,
      isLoading: true,
      isFetching: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDiscoveryInventory>)

    const { result } = renderHook(() => useVirtualMachinesUnified())

    expect(result.current.vmList).toBeUndefined()
    expect(result.current.topology).toBeUndefined()
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isFetching).toBe(true)
    expect(result.current.error).toBe(error)
  })
})
