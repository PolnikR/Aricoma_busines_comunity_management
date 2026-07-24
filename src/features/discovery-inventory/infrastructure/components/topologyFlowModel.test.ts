import { describe, expect, it } from 'vitest'
import type { PositionedInfrastructureTopology } from '../layout/layoutInfrastructureTopology'
import { mapTopologyToFlowElements } from './topologyFlowModel'

const topology: PositionedInfrastructureTopology = {
  nodes: [
    {
      node: {
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
      position: { x: 120, y: 80 },
      size: { width: 260, height: 132 },
    },
    {
      node: {
        id: 'datastore:datastore-01',
        kind: 'datastore',
        label: 'datastore-01',
        virtualMachineCount: 1,
        allocatedCapacityGb: 100,
      },
      position: { x: 480, y: 80 },
      size: { width: 220, height: 104 },
    },
  ],
  edges: [
    {
      id: 'edge:uses:virtualMachine:vm-101:datastore:datastore-01',
      kind: 'uses',
      source: 'virtualMachine:vm-101',
      target: 'datastore:datastore-01',
      capacityGb: 100,
    },
  ],
  size: { width: 700, height: 212 },
}

describe('mapTopologyToFlowElements', () => {
  it('makes virtualMachine nodes draggable', () => {
    const result = mapTopologyToFlowElements(topology)

    expect(result.nodes[0]).toMatchObject({
      id: 'virtualMachine:vm-101',
      type: 'virtualMachine',
      position: { x: 120, y: 80 },
      width: 260,
      height: 132,
      connectable: false,
      deletable: false,
      draggable: true,
    })
    expect(result.nodes[0]?.data).toMatchObject({
      kind: 'virtualMachine',
      virtualMachineId: 'vm-101',
    })
  })

  it('makes datastore nodes draggable', () => {
    const result = mapTopologyToFlowElements(topology)

    expect(result.nodes[1]).toMatchObject({
      id: 'datastore:datastore-01',
      type: 'datastore',
      draggable: true,
    })
  })

  it('keeps cluster nodes non-draggable', () => {
    const clusterTopology: PositionedInfrastructureTopology = {
      nodes: [
        {
          node: {
            id: 'cluster:cluster-01',
            kind: 'cluster',
            label: 'cluster-01',
            hostCount: 3,
          },
          position: { x: 0, y: 0 },
          size: { width: 100, height: 100 },
        },
      ],
      edges: [],
      size: { width: 100, height: 100 },
    }

    const result = mapTopologyToFlowElements(clusterTopology)

    expect(result.nodes[0]).toMatchObject({
      id: 'cluster:cluster-01',
      type: 'cluster',
      draggable: false,
    })
  })

  it('renders datastore relationships as secondary dashed edges', () => {
    const result = mapTopologyToFlowElements(topology)

    expect(result.edges[0]).toMatchObject({
      type: 'smoothstep',
      selectable: false,
      style: {
        stroke: '#9aa8bc',
        strokeDasharray: '5 4',
      },
    })
  })
})
