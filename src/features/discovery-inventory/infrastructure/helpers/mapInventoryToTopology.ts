import type { DiscoveryInventory } from '../../model/discoveryTypes'
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

function createTopologyEdgeId(
  kind: InfrastructureTopologyEdgeKind,
  source: string,
  target: string,
) {
  return `edge:${kind}:${source}:${target}`
}

function compareNodes(first: InfrastructureTopologyNode, second: InfrastructureTopologyNode) {
  const kindDifference = nodeKindOrder[first.kind] - nodeKindOrder[second.kind]
  if (kindDifference !== 0) return kindDifference

  const labelDifference = first.label.localeCompare(second.label)
  return labelDifference !== 0 ? labelDifference : first.id.localeCompare(second.id)
}

export function mapInventoryToTopology(
  inventory: DiscoveryInventory,
): InfrastructureTopology {
  const nodes = new Map<string, InfrastructureTopologyNode>()
  const edges = new Map<string, InfrastructureTopologyEdge>()
  const clusterHosts = new Map<string, Set<string>>()
  const hostDetails = new Map<string, { clusterNames: Set<string>, virtualMachineIds: Set<string> }>()
  const datastoreDetails = new Map<string, { virtualMachineIds: Set<string>, allocatedCapacityGb: number }>()

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
      const hostNodeId = createTopologyNodeId('host', virtualMachine.host)
      const details = hostDetails.get(virtualMachine.host) ?? {
        clusterNames: new Set<string>(),
        virtualMachineIds: new Set<string>(),
      }
      details.virtualMachineIds.add(virtualMachine.id)
      hostDetails.set(virtualMachine.host, details)

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

        const hosts = clusterHosts.get(virtualMachine.cluster) ?? new Set<string>()
        hosts.add(virtualMachine.host)
        clusterHosts.set(virtualMachine.cluster, hosts)
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
      const datastoreNodeId = createTopologyNodeId('datastore', datastoreName)
      const details = datastoreDetails.get(datastoreName) ?? {
        virtualMachineIds: new Set<string>(),
        allocatedCapacityGb: 0,
      }
      details.virtualMachineIds.add(virtualMachine.id)
      details.allocatedCapacityGb += capacityGb
      datastoreDetails.set(datastoreName, details)

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

  for (const [clusterName, hosts] of clusterHosts) {
    const clusterNodeId = createTopologyNodeId('cluster', clusterName)
    nodes.set(clusterNodeId, {
      id: clusterNodeId,
      kind: 'cluster',
      label: clusterName,
      hostCount: hosts.size,
    })

    for (const hostName of hosts) {
      const hostNodeId = createTopologyNodeId('host', hostName)
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

  for (const [hostName, details] of hostDetails) {
    const hostNodeId = createTopologyNodeId('host', hostName)
    const hostNode: HostTopologyNode = {
      id: hostNodeId,
      kind: 'host',
      label: hostName,
      clusterNames: Array.from(details.clusterNames).sort(),
      virtualMachineCount: details.virtualMachineIds.size,
    }
    nodes.set(hostNodeId, hostNode)
  }

  for (const [datastoreName, details] of datastoreDetails) {
    const datastoreNodeId = createTopologyNodeId('datastore', datastoreName)
    const datastoreNode: DatastoreTopologyNode = {
      id: datastoreNodeId,
      kind: 'datastore',
      label: datastoreName,
      virtualMachineCount: details.virtualMachineIds.size,
      allocatedCapacityGb: details.allocatedCapacityGb,
    }
    nodes.set(datastoreNodeId, datastoreNode)
  }

  return {
    nodes: Array.from(nodes.values()).sort(compareNodes),
    edges: Array.from(edges.values()).sort((first, second) => first.id.localeCompare(second.id)),
  }
}
