export type InfrastructureTopologyNodeKind =
  | 'cluster'
  | 'host'
  | 'virtualMachine'
  | 'datastore'
  | 'powerSystem'
  | 'powerPartition'
  | 'pool'
  | 'volume'
  | 'fcmap'
  | 'consistencyGroup'

export type InfrastructureTopologyPlatform = 'vmware' | 'ibm-power' | 'flashsystem'

export type InfrastructureTopologyEdgeKind = 'contains' | 'runs' | 'uses' | 'copies'

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

export interface PowerSystemTopologyNode extends InfrastructureTopologyNodeBase {
  kind: 'powerSystem'
  partitionCount: number
  lparCount: number
  viosCount: number
}

export interface PowerPartitionTopologyNode extends InfrastructureTopologyNodeBase {
  kind: 'powerPartition'
  partitionId: string
  partitionKind: 'LPAR' | 'VIOS'
  partitionState: string
  systemName: string
  operatingSystemType: string
  deviceName: string
  bootMode: string
  volumeName: string
  volumeState: string
}

export interface PoolTopologyNode extends InfrastructureTopologyNodeBase {
  kind: 'pool'
  poolId: string
  status: string
  capacity: string
  freeCapacity: string
  volumeCount: number
  encrypt: string
  easyTier: string
}

export interface FlashVolumeTopologyNode extends InfrastructureTopologyNodeBase {
  kind: 'volume'
  volumeId: string
  status: string
  capacity: string
  role: 'source' | 'target' | null
  isSnapshotTarget: boolean
  hasSnapshots: boolean
  snapshotCount: number
  mdiskGroupName: string
}

export interface FlashCopyMapTopologyNode extends InfrastructureTopologyNodeBase {
  kind: 'fcmap'
  fcmapId: string
  status: string
  progress: string
  copyRate: string
  sourceVolumeId: string
  targetVolumeId: string
  sourceVolumeName: string
  targetVolumeName: string
}

export interface ConsistencyGroupTopologyNode extends InfrastructureTopologyNodeBase {
  kind: 'consistencyGroup'
  groupId: string
  status: string
  fcMappingCount: number
  spansPools: boolean
  poolCount: number
}

export type InfrastructureTopologyNode =
  | ClusterTopologyNode
  | HostTopologyNode
  | VirtualMachineTopologyNode
  | DatastoreTopologyNode
  | PowerSystemTopologyNode
  | PowerPartitionTopologyNode
  | PoolTopologyNode
  | FlashVolumeTopologyNode
  | FlashCopyMapTopologyNode
  | ConsistencyGroupTopologyNode

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
