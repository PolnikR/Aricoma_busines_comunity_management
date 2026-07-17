import { describe, expect, it } from 'vitest'
import type { InfrastructureTopology } from '../model/topologyTypes'
import { layoutInfrastructureTopology } from './layoutInfrastructureTopology'

const topology: InfrastructureTopology = {
  nodes: [
    {
      id: 'cluster:cluster-01',
      kind: 'cluster',
      label: 'cluster-01',
      hostCount: 1,
    },
    {
      id: 'host:esx-01',
      kind: 'host',
      label: 'esx-01',
      clusterNames: ['cluster-01'],
      virtualMachineCount: 1,
    },
    {
      id: 'virtualMachine:vm-101',
      kind: 'virtualMachine',
      label: 'application-01',
      virtualMachineId: 'vm-101',
      powerState: 'poweredOn',
      connectionState: 'connected',
      hostName: 'esx-01',
      clusterName: 'cluster-01',
      folder: 'Applications',
      vcpu: 4,
      memoryGb: 8,
    },
    {
      id: 'datastore:datastore-01',
      kind: 'datastore',
      label: 'datastore-01',
      virtualMachineCount: 1,
      allocatedCapacityGb: 100,
    },
  ],
  edges: [
    {
      id: 'edge:contains:cluster:cluster-01:host:esx-01',
      kind: 'contains',
      source: 'cluster:cluster-01',
      target: 'host:esx-01',
      capacityGb: null,
    },
    {
      id: 'edge:runs:host:esx-01:virtualMachine:vm-101',
      kind: 'runs',
      source: 'host:esx-01',
      target: 'virtualMachine:vm-101',
      capacityGb: null,
    },
    {
      id: 'edge:uses:virtualMachine:vm-101:datastore:datastore-01',
      kind: 'uses',
      source: 'virtualMachine:vm-101',
      target: 'datastore:datastore-01',
      capacityGb: 100,
    },
  ],
}

describe('layoutInfrastructureTopology', () => {
  it('positions graph layers from cluster to datastore', async () => {
    const result = await layoutInfrastructureTopology(topology)
    const positions = new Map(
      result.nodes.map(({ node, position }) => [node.kind, position]),
    )

    expect(positions.get('cluster')?.x).toBeLessThan(positions.get('host')?.x ?? 0)
    expect(positions.get('host')?.x).toBeLessThan(
      positions.get('virtualMachine')?.x ?? 0,
    )
    expect(positions.get('virtualMachine')?.x).toBeLessThan(
      positions.get('datastore')?.x ?? 0,
    )
    expect(result.nodes.every(({ position }) => (
      Number.isFinite(position.x) && Number.isFinite(position.y)
    ))).toBe(true)
    expect(result.size.width).toBeGreaterThan(0)
    expect(result.size.height).toBeGreaterThan(0)
  })

  it('does not mutate the domain topology', async () => {
    const snapshot = structuredClone(topology)

    await layoutInfrastructureTopology(topology)

    expect(topology).toEqual(snapshot)
  })

  it('returns an empty positioned graph without invoking a failing layout', async () => {
    await expect(layoutInfrastructureTopology({ nodes: [], edges: [] })).resolves.toEqual({
      nodes: [],
      edges: [],
      size: { width: 0, height: 0 },
    })
  })
})
