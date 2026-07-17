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
})
