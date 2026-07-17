export type InfrastructureTopologyNodeKind =
  | 'cluster'
  | 'host'
  | 'virtualMachine'
  | 'datastore'

export type InfrastructureTopologyEdgeKind = 'contains' | 'runs' | 'uses'

interface InfrastructureTopologyNodeBase {
  id: string
  kind: InfrastructureTopologyNodeKind
  label: string
}

export interface ClusterTopologyNode extends InfrastructureTopologyNodeBase {
  kind: 'cluster'
  hostCount: number
}

export interface HostTopologyNode extends InfrastructureTopologyNodeBase {
  kind: 'host'
  clusterNames: string[]
  virtualMachineCount: number
}

export interface VirtualMachineTopologyNode extends InfrastructureTopologyNodeBase {
  kind: 'virtualMachine'
  virtualMachineId: string
  powerState: string
  connectionState: string
  hostName: string
  clusterName: string
  folder: string
  vcpu: number
  memoryGb: number
}

export interface DatastoreTopologyNode extends InfrastructureTopologyNodeBase {
  kind: 'datastore'
  virtualMachineCount: number
  allocatedCapacityGb: number
}

export type InfrastructureTopologyNode =
  | ClusterTopologyNode
  | HostTopologyNode
  | VirtualMachineTopologyNode
  | DatastoreTopologyNode

export interface InfrastructureTopologyEdge {
  id: string
  kind: InfrastructureTopologyEdgeKind
  source: string
  target: string
  capacityGb: number | null
}

export interface InfrastructureTopology {
  nodes: InfrastructureTopologyNode[]
  edges: InfrastructureTopologyEdge[]
}
