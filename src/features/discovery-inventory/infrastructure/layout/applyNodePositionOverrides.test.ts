import { describe, it, expect } from 'vitest'
import type { PositionedInfrastructureTopologyNode } from './layoutInfrastructureTopology'
import type { PositionedInfrastructureTopology } from './layoutInfrastructureTopology'
import type { TopologyNodePositionOverrides } from '../hooks/useTopologyNodePositionOverrides'
import { applyTopologyNodePositionOverrides } from './applyNodePositionOverrides'

function createPositionedNode(
  id: string,
  x: number,
  y: number,
): PositionedInfrastructureTopologyNode {
  return {
    node: {
      id,
      kind: 'host',
      label: `Node ${id}`,
      clusterNames: [],
      virtualMachineCount: 0,
    },
    position: { x, y },
    size: { width: 100, height: 50 },
  }
}

function createTopology(nodes: PositionedInfrastructureTopologyNode[]): PositionedInfrastructureTopology {
  return {
    nodes,
    edges: [],
    size: { width: 100, height: 100 },
  }
}

describe('applyTopologyNodePositionOverrides', () => {
  it('returns the same object reference when overrides is empty', () => {
    const topology = createTopology([
      createPositionedNode('host:esx-01', 100, 200),
    ])

    const result = applyTopologyNodePositionOverrides(topology, {})

    expect(result).toBe(topology)
  })

  it('replaces position when override exists for a node', () => {
    const topology = createTopology([
      createPositionedNode('host:esx-01', 100, 200),
      createPositionedNode('host:esx-02', 300, 400),
    ])

    const overrides: TopologyNodePositionOverrides = {
      'host:esx-01': { x: 999, y: 888 },
    }

    const result = applyTopologyNodePositionOverrides(topology, overrides)

    expect(result.nodes[0]?.position).toEqual({ x: 999, y: 888 })
    expect(result.nodes[1]?.position).toEqual({ x: 300, y: 400 })
  })

  it('leaves position untouched when no override exists for a node', () => {
    const topology = createTopology([
      createPositionedNode('host:esx-01', 100, 200),
      createPositionedNode('host:esx-02', 300, 400),
    ])

    const overrides: TopologyNodePositionOverrides = {
      'host:esx-02': { x: 999, y: 888 },
    }

    const result = applyTopologyNodePositionOverrides(topology, overrides)

    expect(result.nodes[0]?.position).toEqual({ x: 100, y: 200 })
    expect(result.nodes[1]?.position).toEqual({ x: 999, y: 888 })
  })

  it('applies overrides to all matching nodes', () => {
    const topology = createTopology([
      createPositionedNode('host:esx-01', 100, 200),
      createPositionedNode('host:esx-02', 300, 400),
      createPositionedNode('vm:vm-42', 500, 600),
    ])

    const overrides: TopologyNodePositionOverrides = {
      'host:esx-01': { x: 111, y: 222 },
      'vm:vm-42': { x: 555, y: 666 },
    }

    const result = applyTopologyNodePositionOverrides(topology, overrides)

    expect(result.nodes[0]?.position).toEqual({ x: 111, y: 222 })
    expect(result.nodes[1]?.position).toEqual({ x: 300, y: 400 })
    expect(result.nodes[2]?.position).toEqual({ x: 555, y: 666 })
  })

  it('does not mutate the input topology', () => {
    const originalNode = createPositionedNode('host:esx-01', 100, 200)
    const topology = createTopology([originalNode])
    const originalPosition = { ...originalNode.position }

    const overrides: TopologyNodePositionOverrides = {
      'host:esx-01': { x: 999, y: 888 },
    }

    applyTopologyNodePositionOverrides(topology, overrides)

    expect(originalNode.position).toEqual(originalPosition)
  })

  it('ignores overrides for node ids that do not exist in the topology', () => {
    const topology = createTopology([
      createPositionedNode('host:esx-01', 100, 200),
    ])

    const overrides: TopologyNodePositionOverrides = {
      'host:esx-01': { x: 999, y: 888 },
      'host:nonexistent': { x: 777, y: 666 },
    }

    const result = applyTopologyNodePositionOverrides(topology, overrides)

    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]?.position).toEqual({ x: 999, y: 888 })
  })
})
