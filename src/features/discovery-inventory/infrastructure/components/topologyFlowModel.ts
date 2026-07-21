import type { Edge, Node } from '@xyflow/react'
import type { PositionedInfrastructureTopology } from '../layout/layoutInfrastructureTopology'
import type {
  InfrastructureTopologyNode,
  InfrastructureTopologyNodeKind,
} from '../model/topologyTypes'

export type InfrastructureFlowNode = Node<
  InfrastructureTopologyNode & Record<string, unknown>,
  InfrastructureTopologyNodeKind
>

export interface InfrastructureFlowElements {
  nodes: InfrastructureFlowNode[]
  edges: Edge[]
}

const draggableNodeKinds = new Set<InfrastructureTopologyNodeKind>([
  'host',
  'virtualMachine',
  'datastore',
])

export function mapTopologyToFlowElements(
  topology: PositionedInfrastructureTopology,
): InfrastructureFlowElements {
  return {
    nodes: topology.nodes.map(({ node, position, size }) => ({
      id: node.id,
      type: node.kind,
      data: { ...node },
      position,
      width: size.width,
      height: size.height,
      ariaLabel: `${node.kind}: ${node.label}`,
      connectable: false,
      deletable: false,
      draggable: draggableNodeKinds.has(node.kind),
      selectable: true,
    })),
    edges: topology.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      deletable: false,
      focusable: false,
      selectable: false,
      animated: false,
      style: edge.kind === 'uses'
        ? { stroke: '#9aa8bc', strokeDasharray: '5 4', strokeWidth: 1.25 }
        : { stroke: '#8bb9d8', strokeWidth: 1.5 },
    })),
  }
}
