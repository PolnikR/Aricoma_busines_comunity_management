import type {
  InfrastructureTopology,
  InfrastructureTopologyNode,
  VirtualMachineTopologyNode,
} from './topologyTypes'

export interface InfrastructureTopologyFilters {
  search: string
  powerState: string
  host: string
  showDatastores: boolean
}

export interface InfrastructureTopologyFilterOptions {
  hosts: string[]
}

export const defaultInfrastructureTopologyFilters: InfrastructureTopologyFilters = {
  search: '',
  powerState: '',
  host: '',
  showDatastores: false,
}

function isVirtualMachine(
  node: InfrastructureTopologyNode,
): node is VirtualMachineTopologyNode {
  return node.kind === 'virtualMachine'
}

export function getInfrastructureTopologyFilterOptions(
  topology: InfrastructureTopology,
): InfrastructureTopologyFilterOptions {
  return {
    hosts: topology.nodes
      .filter((node) => node.kind === 'host')
      .map((node) => node.label)
      .sort((first, second) => first.localeCompare(second)),
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

  const includedNodeIds = new Set(selectedVirtualMachineIds)

  for (const edge of topology.edges) {
    if (edge.kind === 'runs' && selectedVirtualMachineIds.has(edge.target)) {
      includedNodeIds.add(edge.source)
    }
  }

  for (const edge of topology.edges) {
    if (edge.kind === 'contains' && includedNodeIds.has(edge.target)) {
      includedNodeIds.add(edge.source)
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
