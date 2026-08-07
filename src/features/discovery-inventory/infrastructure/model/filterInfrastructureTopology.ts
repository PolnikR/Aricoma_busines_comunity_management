import type {
  ConsistencyGroupTopologyNode,
  FlashCopyMapTopologyNode,
  FlashVolumeTopologyNode,
  InfrastructureTopology,
  InfrastructureTopologyNode,
  PoolTopologyNode,
  PowerPartitionTopologyNode,
  VirtualMachineTopologyNode,
} from './topologyTypes'

export interface InfrastructureTopologyFilters {
  search: string
  powerState: string
  host: string
  showDatastores: boolean
  system: string
  partitionKind: string
  partitionState: string
}

export interface InfrastructureTopologyFilterOptions {
  hosts: string[]
  systems: string[]
  partitionStates: string[]
}

export const defaultInfrastructureTopologyFilters: InfrastructureTopologyFilters = {
  search: '',
  powerState: '',
  host: '',
  showDatastores: false,
  system: '',
  partitionKind: '',
  partitionState: '',
}

function isPowerPartition(
  node: InfrastructureTopologyNode,
): node is PowerPartitionTopologyNode {
  return node.kind === 'powerPartition'
}

function isVirtualMachine(
  node: InfrastructureTopologyNode,
): node is VirtualMachineTopologyNode {
  return node.kind === 'virtualMachine'
}

type FlashSystemTopologyNode =
  | PoolTopologyNode
  | FlashVolumeTopologyNode
  | FlashCopyMapTopologyNode
  | ConsistencyGroupTopologyNode

function isFlashSystemNode(
  node: InfrastructureTopologyNode,
): node is FlashSystemTopologyNode {
  return node.kind === 'pool' || node.kind === 'volume' || node.kind === 'fcmap' || node.kind === 'consistencyGroup'
}

function getFlashSystemSearchableValues(node: FlashSystemTopologyNode): string[] {
  switch (node.kind) {
    case 'pool':
      return [node.label, node.status, node.capacity]
    case 'volume':
      return [node.label, node.status, node.capacity, node.mdiskGroupName]
    case 'fcmap':
      return [node.label, node.status, node.sourceVolumeName, node.targetVolumeName]
    case 'consistencyGroup':
      return [node.label, node.status]
  }
}

export function getInfrastructureTopologyFilterOptions(
  topology: InfrastructureTopology,
): InfrastructureTopologyFilterOptions {
  return {
    hosts: topology.nodes
      .filter((node) => node.kind === 'host')
      .map((node) => node.label)
      .sort((first, second) => first.localeCompare(second)),
    systems: topology.nodes
      .filter((node) => node.kind === 'powerSystem')
      .map((node) => node.label)
      .sort((first, second) => first.localeCompare(second)),
    partitionStates: Array.from(new Set(
      topology.nodes
        .filter(isPowerPartition)
        .map((node) => node.partitionState)
        .filter(Boolean),
    )).sort((first, second) => first.localeCompare(second)),
  }
}

export function filterInfrastructureTopology(
  topology: InfrastructureTopology,
  filters: InfrastructureTopologyFilters,
): InfrastructureTopology {
  const nodesById = new Map(topology.nodes.map((node) => [node.id, node]))
  const datastoreNamesByVirtualMachine = new Map<string, string[]>()

  for (const edge of topology.edges) {
    if (edge.kind !== 'uses') continue

    const datastore = nodesById.get(edge.target)
    if (!datastore) continue

    const names = datastoreNamesByVirtualMachine.get(edge.source) ?? []
    names.push(datastore.label)
    datastoreNamesByVirtualMachine.set(edge.source, names)
  }

  const search = filters.search.trim().toLowerCase()
  const selectedVirtualMachineIds = new Set(
    topology.nodes
      .filter(isVirtualMachine)
      .filter((node) => {
        if (filters.powerState && node.powerState !== filters.powerState) return false
        if (filters.host && node.hostName !== filters.host) return false
        if (!search) return true

        const searchableValues = [
          node.label,
          node.hostName,
          node.clusterName,
          node.folder,
          ...(datastoreNamesByVirtualMachine.get(node.id) ?? []),
        ]
        return searchableValues.some((value) => value.toLowerCase().includes(search))
      })
      .map((node) => node.id),
  )

  const selectedFlashSystemIds = new Set(
    topology.nodes
      .filter(isFlashSystemNode)
      .filter((node) => {
        if (!search) return true
        return getFlashSystemSearchableValues(node).some((value) => value.toLowerCase().includes(search))
      })
      .map((node) => node.id),
  )

  const includedNodeIds = new Set([...selectedVirtualMachineIds, ...selectedFlashSystemIds])
  const selectedPowerPartitionIds = new Set(
    topology.nodes
      .filter(isPowerPartition)
      .filter((node) => {
        if (filters.system && node.systemName !== filters.system) return false
        if (filters.partitionKind && node.partitionKind !== filters.partitionKind) return false
        if (filters.partitionState && node.partitionState !== filters.partitionState) return false
        if (!search) return true

        return [
          node.label,
          node.systemName,
          node.operatingSystemType,
          node.deviceName,
          node.bootMode,
          node.volumeName,
          node.volumeState,
        ].some((value) => value.toLowerCase().includes(search))
      })
      .map((node) => node.id),
  )

  for (const partitionId of selectedPowerPartitionIds) {
    includedNodeIds.add(partitionId)
  }

  for (const edge of topology.edges) {
    if (edge.kind === 'runs' && selectedVirtualMachineIds.has(edge.target)) {
      includedNodeIds.add(edge.source)
    }
  }

  // Propagate contains edges to fixed point (handles deep chains like pool→volume→fcmap→target)
  let changed = true
  while (changed) {
    changed = false
    for (const edge of topology.edges) {
      if (edge.kind === 'contains' && includedNodeIds.has(edge.target) && !includedNodeIds.has(edge.source)) {
        includedNodeIds.add(edge.source)
        changed = true
      }
    }
  }

  if (filters.showDatastores) {
    for (const edge of topology.edges) {
      if (edge.kind === 'uses' && selectedVirtualMachineIds.has(edge.source)) {
        includedNodeIds.add(edge.target)
      }
    }
  }

  return {
    nodes: topology.nodes.filter((node) => includedNodeIds.has(node.id)),
    edges: topology.edges.filter((edge) => (
      includedNodeIds.has(edge.source)
      && includedNodeIds.has(edge.target)
      && (filters.showDatastores || edge.kind !== 'uses')
    )),
  }
}
