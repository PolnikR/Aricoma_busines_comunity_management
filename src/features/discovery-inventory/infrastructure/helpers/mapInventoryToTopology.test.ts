import { describe, expect, it } from 'vitest'
import type {
  DiscoveredVirtualMachine,
  DiscoveryInventory,
} from '../../model/discoveryTypes'
import { mapInventoryToTopology } from './mapInventoryToTopology'

function createVirtualMachine(
  overrides: Partial<DiscoveredVirtualMachine> = {},
): DiscoveredVirtualMachine {
  return {
    id: 'vm-101',
    name: 'application-01',
    powerState: 'poweredOn',
    connectionState: 'connected',
    guestOs: 'Linux',
    hostname: 'application-01',
    ipAddress: '10.0.0.10',
    vcpu: 4,
    memoryGb: 8,
    host: 'esx-01',
    cluster: 'cluster-01',
    primaryDatastore: 'datastore-01',
    folder: 'Applications',
    vmPath: '[datastore-01] application-01/application-01.vmx',
    providerId: 'vcenter-01',
    providerType: 'VMWARE',
    disks: [
      {
        id: 'disk-101',
        label: 'Hard disk 1',
        capacityGb: 100,
        datastore: 'datastore-02',
        filePath: '[datastore-02] application-01/disk.vmdk',
        thinProvisioned: true,
      },
    ],
    snapshotCount: 0,
    toolsStatus: 'toolsOk',
    tags: [],
    ...overrides,
  }
}

function createInventory(
  virtualMachines: DiscoveredVirtualMachine[],
): DiscoveryInventory {
  return {
    reportedCount: virtualMachines.length,
    virtualMachines,
  }
}

describe('mapInventoryToTopology', () => {
  it('creates deduplicated infrastructure nodes and supported relationships', () => {
    const inventory = createInventory([
      createVirtualMachine(),
      createVirtualMachine({
        id: 'vm-102',
        name: 'database-01',
        disks: [
          {
            id: 'disk-102',
            label: 'Hard disk 1',
            capacityGb: 20,
            datastore: 'datastore-01',
            filePath: '[datastore-01] database-01/disk.vmdk',
            thinProvisioned: true,
          },
        ],
      }),
    ])

    const topology = mapInventoryToTopology(inventory)

    expect(topology.nodes).toHaveLength(6)
    expect(topology.edges).toHaveLength(6)
    expect(topology.nodes.find((node) => node.id === 'cluster:cluster-01')).toMatchObject({
      kind: 'cluster',
      hostCount: 1,
    })
    expect(topology.nodes.find((node) => node.id === 'host:esx-01')).toMatchObject({
      kind: 'host',
      virtualMachineCount: 2,
    })
    expect(topology.nodes.find((node) => node.id === 'datastore:datastore-01')).toMatchObject({
      kind: 'datastore',
      virtualMachineCount: 2,
      allocatedCapacityGb: 20,
    })
    expect(topology.nodes.find((node) => node.id === 'datastore:datastore-02')).toMatchObject({
      kind: 'datastore',
      virtualMachineCount: 1,
      allocatedCapacityGb: 100,
    })
    expect(new Set(topology.edges.map((edge) => edge.kind))).toEqual(
      new Set(['contains', 'runs', 'uses']),
    )
  })

  it('does not create infrastructure relationships from missing values', () => {
    const topology = mapInventoryToTopology(createInventory([
      createVirtualMachine({
        host: '-',
        cluster: 'unknown',
        primaryDatastore: '-',
        disks: [],
      }),
    ]))

    expect(topology.nodes).toHaveLength(1)
    expect(topology.nodes[0]?.kind).toBe('virtualMachine')
    expect(topology.edges).toEqual([])
  })

  it('returns a deterministic graph for the same inventory', () => {
    const inventory = createInventory([
      createVirtualMachine({ id: 'vm-102', name: 'database-01' }),
      createVirtualMachine(),
    ])

    expect(mapInventoryToTopology(inventory)).toEqual(mapInventoryToTopology(inventory))
  })
})
