import type { NodeTypes } from '@xyflow/react'
import { ClusterNode } from './nodes/ClusterNode'
import { DatastoreNode } from './nodes/DatastoreNode'
import { HostNode } from './nodes/HostNode'
import { VirtualMachineNode } from './nodes/VirtualMachineNode'
import { PowerPartitionNode } from './nodes/PowerPartitionNode'
import { PowerSystemNode } from './nodes/PowerSystemNode'

export const topologyNodeTypes = {
  cluster: ClusterNode,
  host: HostNode,
  virtualMachine: VirtualMachineNode,
  datastore: DatastoreNode,
  powerSystem: PowerSystemNode,
  powerPartition: PowerPartitionNode,
} satisfies NodeTypes
