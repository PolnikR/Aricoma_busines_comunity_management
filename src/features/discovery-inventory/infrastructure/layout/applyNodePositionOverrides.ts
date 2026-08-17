import type { PositionedInfrastructureTopology } from './layoutInfrastructureTopology'
import type { TopologyNodePositionOverrides } from '../hooks/useTopologyNodePositionOverrides'

export function applyTopologyNodePositionOverrides(
  topology: PositionedInfrastructureTopology,
  overrides: TopologyNodePositionOverrides,
): PositionedInfrastructureTopology {
  if (Object.keys(overrides).length === 0) return topology

  return {
    ...topology,
    nodes: topology.nodes.map((positioned) => {
      const override = overrides[positioned.node.id]
      return override ? { ...positioned, position: override } : positioned
    }),
  }
}
