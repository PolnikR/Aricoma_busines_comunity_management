import type { PowerInventory } from '../../model/discoveryTypes'
import type {
  InfrastructureTopology,
  InfrastructureTopologyEdge,
  InfrastructureTopologyNode,
  PowerPartitionTopologyNode,
  PowerSystemTopologyNode,
} from '../model/topologyTypes'
import { createTopologyNodeId } from './mapInventoryToTopology'

const missingTopologyValues = new Set(['', '-', 'unknown'])

function isKnownTopologyValue(value: string) {
  return !missingTopologyValues.has(value.trim().toLowerCase())
}

function createContainmentEdge(source: string, target: string): InfrastructureTopologyEdge {
  return {
    id: `edge:contains:${source}:${target}`,
    kind: 'contains',
    source,
    target,
    capacityGb: null,
  }
}

export function mapPowerInventoryToTopology(
  inventory: PowerInventory,
): InfrastructureTopology {
  const nodes = new Map<string, InfrastructureTopologyNode>()
  const edges = new Map<string, InfrastructureTopologyEdge>()
  const systems = new Map<string, {
    label: string
    lparIds: Set<string>
    viosIds: Set<string>
  }>()

  for (const partition of inventory.partitions) {
    const partitionNodeId = createTopologyNodeId('powerPartition', partition.id)
    const partitionNode: PowerPartitionTopologyNode = {
      id: partitionNodeId,
      kind: 'powerPartition',
      label: partition.partitionName || partition.id,
      partitionId: partition.id,
      partitionKind: partition.partitionKind,
      partitionState: partition.partitionState,
      systemName: partition.systemName,
      operatingSystemType: partition.operatingSystemType,
      deviceName: partition.deviceName,
      bootMode: partition.bootMode,
      volumeName: partition.volumeName,
      volumeState: partition.volumeState,
    }
    nodes.set(partitionNodeId, partitionNode)

    if (!isKnownTopologyValue(partition.systemName)) continue

    const systemNodeId = createTopologyNodeId(
      'powerSystem',
      `${partition.providerId}:${partition.systemName}`,
    )
    const system = systems.get(systemNodeId) ?? {
      label: partition.systemName,
      lparIds: new Set<string>(),
      viosIds: new Set<string>(),
    }
    const partitionIds = partition.partitionKind === 'LPAR'
      ? system.lparIds
      : system.viosIds
    partitionIds.add(partitionNodeId)
    systems.set(systemNodeId, system)

    const edge = createContainmentEdge(systemNodeId, partitionNodeId)
    edges.set(edge.id, edge)
  }

  for (const [systemNodeId, system] of systems) {
    const systemNode: PowerSystemTopologyNode = {
      id: systemNodeId,
      kind: 'powerSystem',
      label: system.label,
      partitionCount: system.lparIds.size + system.viosIds.size,
      lparCount: system.lparIds.size,
      viosCount: system.viosIds.size,
    }
    nodes.set(systemNodeId, systemNode)
  }

  return {
    nodes: Array.from(nodes.values()).sort((first, second) => (
      first.kind.localeCompare(second.kind)
      || first.label.localeCompare(second.label)
      || first.id.localeCompare(second.id)
    )),
    edges: Array.from(edges.values()).sort((first, second) => first.id.localeCompare(second.id)),
  }
}
