import { describe, expect, it } from 'vitest'
import { mapInventoryToVirtualMachines } from './mapInventoryToVirtualMachines'
import type { DiscoveryInventory } from '../../model/discoveryTypes'

describe('mapInventoryToVirtualMachines', () => {
  it('maps disks, metrics, and sorted unique filter options', () => {
    const inventory: DiscoveryInventory = {
      reportedCount: 2,
      virtualMachines: [
        {
          id: '1', name: 'VM-1', powerState: 'poweredOn', connectionState: 'connected',
          guestOs: 'Linux', hostname: 'vm-1', ipAddress: '10.0.0.1', vcpu: 2,
          memoryGb: 4, host: 'host-1', cluster: 'cluster-b', primaryDatastore: 'ds-1',
          folder: '', vmPath: '', providerId: 'p1', providerType: 'VMWARE',
          disks: [{ id: 'd1', label: 'Disk', capacityGb: 50, datastore: 'ds-1', filePath: '', thinProvisioned: true }],
          snapshotCount: 0, toolsStatus: 'ok', tags: ['prod'],
        },
        {
          id: '2', name: 'VM-2', powerState: 'poweredOff', connectionState: 'connected',
          guestOs: 'Windows', hostname: 'vm-2', ipAddress: '', vcpu: 4,
          memoryGb: 8, host: 'host-2', cluster: 'cluster-a', primaryDatastore: 'ds-2',
          folder: '', vmPath: '', providerId: 'p1', providerType: 'VMWARE',
          disks: [], snapshotCount: 1, toolsStatus: 'old', tags: [],
        },
      ],
    }

    const result = mapInventoryToVirtualMachines(inventory)
    expect(result.virtualMachines[0]).toMatchObject({ diskCount: 1, diskCapacityGb: 50 })
    expect(result.metrics).toEqual({
      total: 2, poweredOn: 1, clusters: 2, totalCpu: 6, totalMemoryGb: 12,
    })
    expect(result.filterOptions.clusters).toEqual(['cluster-a', 'cluster-b'])
  })
})
