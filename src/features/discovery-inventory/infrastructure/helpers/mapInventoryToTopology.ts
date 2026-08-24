import type { DiscoveryInventory } from '../../resources/model/discoveryTypes'
import type {
  DatastoreTopologyNode,
  HostTopologyNode,
  InfrastructureTopology,
  InfrastructureTopologyEdge,
  InfrastructureTopologyEdgeKind,
  InfrastructureTopologyNode,
  InfrastructureTopologyNodeKind,
} from '../model/topologyTypes'

const missingTopologyValues = new Set(['', '-', 'unknown'])

const nodeKindOrder: Record<InfrastructureTopologyNodeKind, number> = {
  cluster: 0,
  host: 1,
  virtualMachine: 2,
  datastore: 3,
  powerSystem: 4,
  powerPartition: 5,
  pool: 6,
  volume: 7,
  fcmap: 8,
  consistencyGroup: 9,
}

function isKnownTopologyValue(value: string) {
  return !missingTopologyValues.has(value.trim().toLowerCase())
}

export function createTopologyNodeId(
  kind: InfrastructureTopologyNodeKind,
  sourceId: string,
) {
  return `${kind}:${encodeURIComponent(sourceId.trim())}`
}

export function createTopologyEdgeId(
  kind: InfrastructureTopologyEdgeKind,
  source: string,
  target: string,
) {
  return `edge:${kind}:${source}:${target}`
}

const edgeKindOrder: Record<InfrastructureTopologyEdgeKind, number> = {
  contains: 0,
  runs: 1,
  uses: 2,
  copies: 3,
}

export function compareNodes(first: InfrastructureTopologyNode, second: InfrastructureTopologyNode) {
  const kindDifference = nodeKindOrder[first.kind] - nodeKindOrder[second.kind]
  if (kindDifference !== 0) return kindDifference

  const labelDifference = first.label.localeCompare(second.label)
  return labelDifference !== 0 ? labelDifference : first.id.localeCompare(second.id)
}

export function compareEdges(first: InfrastructureTopologyEdge, second: InfrastructureTopologyEdge) {
  const kindDifference = edgeKindOrder[first.kind] - edgeKindOrder[second.kind]
  if (kindDifference !== 0) return kindDifference

  const sourceDifference = first.source.localeCompare(second.source)
  if (sourceDifference !== 0) return sourceDifference

  const targetDifference = first.target.localeCompare(second.target)
  return targetDifference !== 0 ? targetDifference : first.id.localeCompare(second.id)
}

export function mapInventoryToTopology(
  inventory: DiscoveryInventory,
): InfrastructureTopology {
  const nodes = new Map<string, InfrastructureTopologyNode>()
  const edges = new Map<string, InfrastructureTopologyEdge>()
  const clusterHosts = new Map<string, { label: string, hosts: Map<string, string> }>()
  const hostDetails = new Map<string, {
    label: string
    clusterNames: Set<string>
    virtualMachineIds: Set<string>
  }>()
  const datastoreDetails = new Map<string, {
    label: string
    virtualMachineIds: Set<string>
    allocatedCapacityGb: number
  }>()

  for (const virtualMachine of inventory.virtualMachines) {
    const virtualMachineNodeId = createTopologyNodeId('virtualMachine', virtualMachine.id)

    nodes.set(virtualMachineNodeId, {
      id: virtualMachineNodeId,
      kind: 'virtualMachine',
      label: virtualMachine.name,
      virtualMachineId: virtualMachine.id,
      powerState: virtualMachine.powerState,
      connectionState: virtualMachine.connectionState,
      hostName: virtualMachine.host,
      clusterName: virtualMachine.cluster,
      folder: virtualMachine.folder,
      vcpu: virtualMachine.vcpu,
      memoryGb: virtualMachine.memoryGb,
    })

    if (isKnownTopologyValue(virtualMachine.host)) {
      const hostNodeId = createTopologyNodeId(
        'host',
        `${virtualMachine.providerId}:${virtualMachine.host}`,
      )
      const details = hostDetails.get(hostNodeId) ?? {
        label: virtualMachine.host,
        clusterNames: new Set<string>(),
        virtualMachineIds: new Set<string>(),
      }
      details.virtualMachineIds.add(virtualMachine.id)
      hostDetails.set(hostNodeId, details)

      const edgeId = createTopologyEdgeId('runs', hostNodeId, virtualMachineNodeId)
      edges.set(edgeId, {
        id: edgeId,
        kind: 'runs',
        source: hostNodeId,
        target: virtualMachineNodeId,
        capacityGb: null,
      })

      if (isKnownTopologyValue(virtualMachine.cluster)) {
        details.clusterNames.add(virtualMachine.cluster)

        const clusterNodeId = createTopologyNodeId(
          'cluster',
          `${virtualMachine.providerId}:${virtualMachine.cluster}`,
        )
        const cluster = clusterHosts.get(clusterNodeId) ?? {
          label: virtualMachine.cluster,
          hosts: new Map<string, string>(),
        }
        cluster.hosts.set(hostNodeId, virtualMachine.host)
        clusterHosts.set(clusterNodeId, cluster)
      }
    }

    const datastoreCapacities = new Map<string, number>()

    for (const disk of virtualMachine.disks) {
      if (!isKnownTopologyValue(disk.datastore)) continue

      datastoreCapacities.set(
        disk.datastore,
        (datastoreCapacities.get(disk.datastore) ?? 0) + disk.capacityGb,
      )
    }

    if (isKnownTopologyValue(virtualMachine.primaryDatastore)) {
      datastoreCapacities.set(
        virtualMachine.primaryDatastore,
        datastoreCapacities.get(virtualMachine.primaryDatastore) ?? 0,
      )
    }

    for (const [datastoreName, capacityGb] of datastoreCapacities) {
      const datastoreNodeId = createTopologyNodeId(
        'datastore',
        `${virtualMachine.providerId}:${datastoreName}`,
      )
      const details = datastoreDetails.get(datastoreNodeId) ?? {
        label: datastoreName,
        virtualMachineIds: new Set<string>(),
        allocatedCapacityGb: 0,
      }
      details.virtualMachineIds.add(virtualMachine.id)
      details.allocatedCapacityGb += capacityGb
      datastoreDetails.set(datastoreNodeId, details)

      const edgeId = createTopologyEdgeId('uses', virtualMachineNodeId, datastoreNodeId)
      edges.set(edgeId, {
        id: edgeId,
        kind: 'uses',
        source: virtualMachineNodeId,
        target: datastoreNodeId,
        capacityGb,
      })
    }
  }

  for (const [clusterNodeId, cluster] of clusterHosts) {
    nodes.set(clusterNodeId, {
      id: clusterNodeId,
      kind: 'cluster',
      label: cluster.label,
      hostCount: cluster.hosts.size,
    })

    for (const hostNodeId of cluster.hosts.keys()) {
      const edgeId = createTopologyEdgeId('contains', clusterNodeId, hostNodeId)
      edges.set(edgeId, {
        id: edgeId,
        kind: 'contains',
        source: clusterNodeId,
        target: hostNodeId,
        capacityGb: null,
      })
    }
  }

  for (const [hostNodeId, details] of hostDetails) {
    const hostNode: HostTopologyNode = {
      id: hostNodeId,
      kind: 'host',
      label: details.label,
      clusterNames: Array.from(details.clusterNames).sort(),
      virtualMachineCount: details.virtualMachineIds.size,
    }
    nodes.set(hostNodeId, hostNode)
  }

  for (const [datastoreNodeId, details] of datastoreDetails) {
    const datastoreNode: DatastoreTopologyNode = {
      id: datastoreNodeId,
      kind: 'datastore',
      label: details.label,
      virtualMachineCount: details.virtualMachineIds.size,
      allocatedCapacityGb: details.allocatedCapacityGb,
    }
    nodes.set(datastoreNodeId, datastoreNode)
  }

  return {
    nodes: Array.from(nodes.values()).sort(compareNodes),
    edges: Array.from(edges.values()).sort(compareEdges),
  }
}
