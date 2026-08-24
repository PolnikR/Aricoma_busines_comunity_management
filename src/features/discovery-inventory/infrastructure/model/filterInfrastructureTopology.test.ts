import { describe, expect, it } from 'vitest'
import type { InfrastructureTopology } from './topologyTypes'
import {
  defaultInfrastructureTopologyFilters,
  filterInfrastructureTopology,
} from './filterInfrastructureTopology'

const topology: InfrastructureTopology = {
  nodes: [
    { id: 'cluster:c1', kind: 'cluster', label: 'Cluster A', hostCount: 1 },
    {
      id: 'host:h1',
      kind: 'host',
      label: 'Host A',
      clusterNames: ['Cluster A'],
      virtualMachineCount: 2,
    },
    {
      id: 'virtualMachine:vm1',
      kind: 'virtualMachine',
      label: 'Application VM',
      virtualMachineId: 'vm1',
      powerState: 'poweredOn',
      connectionState: 'connected',
      hostName: 'Host A',
      clusterName: 'Cluster A',
      folder: 'Applications',
      vcpu: 4,
      memoryGb: 8,
    },
    {
      id: 'virtualMachine:vm2',
      kind: 'virtualMachine',
      label: 'Database VM',
      virtualMachineId: 'vm2',
      powerState: 'poweredOff',
      connectionState: 'connected',
      hostName: 'Host A',
      clusterName: 'Cluster A',
      folder: 'Databases',
      vcpu: 8,
      memoryGb: 16,
    },
    {
      id: 'datastore:ds1',
      kind: 'datastore',
      label: 'Gold datastore',
      virtualMachineCount: 1,
      allocatedCapacityGb: 100,
    },
  ],
  edges: [
    {
      id: 'contains',
      kind: 'contains',
      source: 'cluster:c1',
      target: 'host:h1',
      capacityGb: null,
    },
    {
      id: 'runs-vm1',
      kind: 'runs',
      source: 'host:h1',
      target: 'virtualMachine:vm1',
      capacityGb: null,
    },
    {
      id: 'runs-vm2',
      kind: 'runs',
      source: 'host:h1',
      target: 'virtualMachine:vm2',
      capacityGb: null,
    },
    {
      id: 'uses-vm1',
      kind: 'uses',
      source: 'virtualMachine:vm1',
      target: 'datastore:ds1',
      capacityGb: 100,
    },
  ],
}

describe('filterInfrastructureTopology', () => {
  it('keeps the infrastructure context of matching virtual machines', () => {
    const result = filterInfrastructureTopology(topology, {
      ...defaultInfrastructureTopologyFilters,
      powerState: 'poweredOff',
    })

    expect(result.nodes.map((node) => node.id)).toEqual([
      'cluster:c1',
      'host:h1',
      'virtualMachine:vm2',
    ])
    expect(result.edges.map((edge) => edge.id)).toEqual(['contains', 'runs-vm2'])
  })

  it('matches datastore names and includes datastore edges when enabled', () => {
    const result = filterInfrastructureTopology(topology, {
      ...defaultInfrastructureTopologyFilters,
      search: 'gold',
      showDatastores: true,
    })

    expect(result.nodes.map((node) => node.id)).toEqual([
      'cluster:c1',
      'host:h1',
      'virtualMachine:vm1',
      'datastore:ds1',
    ])
    expect(result.edges.map((edge) => edge.id)).toEqual([
      'contains',
      'runs-vm1',
      'uses-vm1',
    ])
  })

  it('removes datastore nodes and orphan edges when the layer is hidden', () => {
    const result = filterInfrastructureTopology(
      topology,
      defaultInfrastructureTopologyFilters,
    )

    expect(result.nodes.some((node) => node.kind === 'datastore')).toBe(false)
    expect(result.edges.some((edge) => edge.kind === 'uses')).toBe(false)
  })

  it('filters IBM Power partitions and preserves their managed-system context', () => {
    const powerTopology: InfrastructureTopology = {
      nodes: [
        {
          id: 'powerSystem:s1',
          kind: 'powerSystem',
          label: 'Power System A',
          partitionCount: 2,
          lparCount: 1,
          viosCount: 1,
        },
        {
          id: 'powerPartition:lpar1',
          kind: 'powerPartition',
          label: 'Payments LPAR',
          partitionId: 'lpar1',
          partitionKind: 'LPAR',
          partitionState: 'running',
          systemName: 'Power System A',
          operatingSystemType: 'AIX',
          deviceName: '',
          bootMode: 'Normal',
          volumeName: '',
          volumeState: '',
        },
        {
          id: 'powerPartition:vios1',
          kind: 'powerPartition',
          label: 'VIOS A',
          partitionId: 'vios1',
          partitionKind: 'VIOS',
          partitionState: 'not activated',
          systemName: 'Power System A',
          operatingSystemType: 'VIOS',
          deviceName: 'ent0',
          bootMode: 'Normal',
          volumeName: 'hdisk1',
          volumeState: 'active',
        },
      ],
      edges: [
        { id: 'contains-lpar', kind: 'contains', source: 'powerSystem:s1', target: 'powerPartition:lpar1', capacityGb: null },
        { id: 'contains-vios', kind: 'contains', source: 'powerSystem:s1', target: 'powerPartition:vios1', capacityGb: null },
      ],
    }

    expect(filterInfrastructureTopology(powerTopology, {
      ...defaultInfrastructureTopologyFilters,
      partitionKind: 'VIOS',
      search: 'hdisk',
    })).toEqual({
      nodes: [powerTopology.nodes[0], powerTopology.nodes[2]],
      edges: [powerTopology.edges[1]],
    })
  })

  it('keeps FlashSystem pool/volume/fcmap/consistencyGroup nodes with an empty search', () => {
    const flashTopology: InfrastructureTopology = {
      nodes: [
        {
          id: 'pool:0', kind: 'pool', label: 'Pool0', poolId: '0', status: 'online',
          capacity: '10.00TB', freeCapacity: '5.00TB', volumeCount: 1, encrypt: 'no', easyTier: 'on',
        },
        {
          id: 'volume:0', kind: 'volume', label: 'Volume0', volumeId: '0', status: 'online',
          capacity: '1.00TB', role: null, isSnapshotTarget: false, hasSnapshots: false,
          snapshotCount: 0, mdiskGroupName: 'Pool0',
        },
      ],
      edges: [
        { id: 'contains-vol', kind: 'contains', source: 'pool:0', target: 'volume:0', capacityGb: null },
      ],
    }

    const result = filterInfrastructureTopology(flashTopology, defaultInfrastructureTopologyFilters)

    expect(result.nodes.map((node) => node.id)).toEqual(['pool:0', 'volume:0'])
    expect(result.edges.map((edge) => edge.id)).toEqual(['contains-vol'])
  })

  it('searches FlashSystem nodes by their kind-specific fields', () => {
    const flashTopology: InfrastructureTopology = {
      nodes: [
        {
          id: 'pool:0', kind: 'pool', label: 'Pool0', poolId: '0', status: 'online',
          capacity: '10.00TB', freeCapacity: '5.00TB', volumeCount: 2, encrypt: 'no', easyTier: 'on',
        },
        {
          id: 'volume:0', kind: 'volume', label: 'Volume0', volumeId: '0', status: 'online',
          capacity: '1.00TB', role: null, isSnapshotTarget: false, hasSnapshots: false,
          snapshotCount: 0, mdiskGroupName: 'Pool0',
        },
        {
          id: 'volume:1', kind: 'volume', label: 'Volume1', volumeId: '1', status: 'offline',
          capacity: '1.00TB', role: null, isSnapshotTarget: false, hasSnapshots: false,
          snapshotCount: 0, mdiskGroupName: 'Pool0',
        },
      ],
      edges: [
        { id: 'contains-vol0', kind: 'contains', source: 'pool:0', target: 'volume:0', capacityGb: null },
        { id: 'contains-vol1', kind: 'contains', source: 'pool:0', target: 'volume:1', capacityGb: null },
      ],
    }

    const result = filterInfrastructureTopology(flashTopology, {
      ...defaultInfrastructureTopologyFilters,
      search: 'offline',
    })

    expect(result.nodes.map((node) => node.id)).toEqual(['pool:0', 'volume:1'])
  })
})
