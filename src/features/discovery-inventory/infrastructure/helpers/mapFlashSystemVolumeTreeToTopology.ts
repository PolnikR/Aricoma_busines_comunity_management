import type { FlashSystemTreeNode } from '../../model/discoveryTypes'
import type {
  ConsistencyGroupTopologyNode,
  FlashCopyMapTopologyNode,
  FlashVolumeTopologyNode,
  InfrastructureTopology,
  InfrastructureTopologyEdge,
  InfrastructureTopologyNode,
  PoolTopologyNode,
} from '../model/topologyTypes'
import { compareNodes, compareEdges, createTopologyEdgeId, createTopologyNodeId } from './mapInventoryToTopology'

function toVolumeNode(node: Extract<FlashSystemTreeNode, { kind: 'volume' }>): FlashVolumeTopologyNode {
  return {
    id: createTopologyNodeId('volume', node.id),
    kind: 'volume',
    label: node.name,
    volumeId: node.id,
    status: node.detail.status,
    capacity: node.detail.capacity,
    role: node.detail.role ?? null,
    isSnapshotTarget: node.detail.is_snapshot_target,
    hasSnapshots: node.detail.has_snapshots,
    snapshotCount: node.detail.snapshot_count,
    mdiskGroupName: node.detail.mdisk_grp_name,
  }
}

function mergeVolumeNode(
  existing: FlashVolumeTopologyNode | undefined,
  incoming: FlashVolumeTopologyNode,
): FlashVolumeTopologyNode {
  if (!existing) return incoming
  return { ...incoming, role: incoming.role ?? existing.role }
}

function toFcmapNode(node: Extract<FlashSystemTreeNode, { kind: 'fcmap' }>): FlashCopyMapTopologyNode {
  return {
    id: createTopologyNodeId('fcmap', node.id),
    kind: 'fcmap',
    label: node.name,
    fcmapId: node.id,
    status: node.detail.status,
    progress: node.detail.progress,
    copyRate: node.detail.copy_rate,
    sourceVolumeId: createTopologyNodeId('volume', node.detail.source_vdisk_id),
    targetVolumeId: createTopologyNodeId('volume', node.detail.target_vdisk_id),
    sourceVolumeName: node.detail.source_vdisk_name,
    targetVolumeName: node.detail.target_vdisk_name,
  }
}

function toPoolNode(node: Extract<FlashSystemTreeNode, { kind: 'pool' }>): PoolTopologyNode {
  return {
    id: createTopologyNodeId('pool', node.id),
    kind: 'pool',
    label: node.name,
    poolId: node.id,
    status: node.detail.status,
    capacity: node.detail.capacity,
    freeCapacity: node.detail.free_capacity,
    volumeCount: node.detail.volume_count,
    encrypt: node.detail.encrypt,
    easyTier: node.detail.easy_tier,
  }
}

function toConsistencyGroupNode(
  node: Extract<FlashSystemTreeNode, { kind: 'consistency_group' }>,
): ConsistencyGroupTopologyNode {
  return {
    id: createTopologyNodeId('consistencyGroup', node.id),
    kind: 'consistencyGroup',
    label: node.name,
    groupId: node.id,
    status: node.detail.status,
    fcMappingCount: node.detail.fc_mapping_count,
    spansPools: node.detail.spans_pools,
    poolCount: node.detail.pool_ids.length,
  }
}

export function mapFlashSystemVolumeTreeToTopology(tree: FlashSystemTreeNode[]): InfrastructureTopology {
  const nodes = new Map<string, InfrastructureTopologyNode>()
  const edges = new Map<string, InfrastructureTopologyEdge>()

  function addContainsEdge(parentId: string, childId: string) {
    const id = createTopologyEdgeId('contains', parentId, childId)
    edges.set(id, { id, kind: 'contains', source: parentId, target: childId, capacityGb: null })
  }

  function walk(node: FlashSystemTreeNode, parentId: string | null) {
    let nodeId: string

    switch (node.kind) {
      case 'pool': {
        const poolNode = toPoolNode(node)
        nodes.set(poolNode.id, poolNode)
        nodeId = poolNode.id
        break
      }
      case 'volume': {
        const volumeNode = toVolumeNode(node)
        const existing = nodes.get(volumeNode.id) as FlashVolumeTopologyNode | undefined
        nodes.set(volumeNode.id, mergeVolumeNode(existing, volumeNode))
        nodeId = volumeNode.id
        break
      }
      case 'fcmap': {
        const fcmapNode = toFcmapNode(node)
        nodes.set(fcmapNode.id, fcmapNode)
        nodeId = fcmapNode.id

        if (node.detail.source_vdisk_id && node.detail.target_vdisk_id) {
          const copiesId = createTopologyEdgeId('copies', fcmapNode.sourceVolumeId, fcmapNode.targetVolumeId)
          edges.set(copiesId, {
            id: copiesId,
            kind: 'copies',
            source: fcmapNode.sourceVolumeId,
            target: fcmapNode.targetVolumeId,
            capacityGb: null,
          })
        }
        break
      }
      case 'consistency_group': {
        const groupNode = toConsistencyGroupNode(node)
        nodes.set(groupNode.id, groupNode)
        nodeId = groupNode.id
        break
      }
    }

    if (parentId) addContainsEdge(parentId, nodeId)

    for (const child of node.children) {
      const isCopyTarget = child.kind === 'volume' && child.detail.role === 'target'
      walk(child, isCopyTarget ? null : nodeId)
    }
  }

  for (const root of tree) walk(root, null)

  return {
    nodes: Array.from(nodes.values()).sort(compareNodes),
    edges: Array.from(edges.values()).sort(compareEdges),
  }
}
