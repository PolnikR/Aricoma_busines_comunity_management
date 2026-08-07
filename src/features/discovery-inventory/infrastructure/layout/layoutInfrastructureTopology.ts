import type {
  InfrastructureTopology,
  InfrastructureTopologyNode,
  InfrastructureTopologyNodeKind,
} from '../model/topologyTypes'

interface TopologyNodeSize {
  width: number
  height: number
}

export interface PositionedInfrastructureTopologyNode {
  node: InfrastructureTopologyNode
  position: {
    x: number
    y: number
  }
  size: TopologyNodeSize
}

export interface PositionedInfrastructureTopology {
  nodes: PositionedInfrastructureTopologyNode[]
  edges: InfrastructureTopology['edges']
  size: TopologyNodeSize
}

let elkInstance: unknown = null

const nodeSizes: Record<InfrastructureTopologyNodeKind, TopologyNodeSize> = {
  cluster: { width: 220, height: 96 },
  host: { width: 240, height: 112 },
  virtualMachine: { width: 260, height: 132 },
  datastore: { width: 220, height: 104 },
  powerSystem: { width: 240, height: 112 },
  powerPartition: { width: 260, height: 132 },
  pool: { width: 220, height: 96 },
  volume: { width: 240, height: 112 },
  fcmap: { width: 220, height: 104 },
  consistencyGroup: { width: 240, height: 104 },
}

async function getElkInstance() {
  if (elkInstance) return elkInstance

  const { default: ELK } = await import('elkjs')
  const workerUrl = new URL('elkjs/lib/elk-worker.js', import.meta.url).href
  elkInstance = new ELK({ workerUrl })
  return elkInstance
}

export async function layoutInfrastructureTopology(
  topology: InfrastructureTopology,
): Promise<PositionedInfrastructureTopology> {
  if (topology.nodes.length === 0) {
    return {
      nodes: [],
      edges: [...topology.edges],
      size: { width: 0, height: 0 },
    }
  }

  const elk = await getElkInstance() as { layout: (config: unknown) => Promise<{ children?: Array<{ id: string; x?: number; y?: number }>; width?: number; height?: number }> }
  const layout = await elk.layout({
    id: 'infrastructure-topology',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '40',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
    },
    children: topology.nodes.map((node) => ({
      id: node.id,
      ...nodeSizes[node.kind],
    })),
    edges: topology.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  })

  const positions = new Map<string, { x: number; y: number }>(
    layout.children?.map((node: { id: string; x?: number; y?: number }) => [
      node.id,
      {
        x: node.x ?? 0,
        y: node.y ?? 0,
      },
    ]) ?? [],
  )

  return {
    nodes: topology.nodes.map((node) => ({
      node,
      position: positions.get(node.id) ?? { x: 0, y: 0 },
      size: nodeSizes[node.kind],
    })),
    edges: [...topology.edges],
    size: {
      width: layout.width ?? 0,
      height: layout.height ?? 0,
    },
  }
}
