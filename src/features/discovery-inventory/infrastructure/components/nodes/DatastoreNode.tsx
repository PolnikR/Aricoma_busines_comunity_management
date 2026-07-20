import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { GridIcon } from '@/shared/icons/Icons'
import type { DatastoreTopologyNode } from '../../model/topologyTypes'
import { TopologyNodeShell } from './TopologyNodeShell'

type DatastoreFlowNode = Node<
  DatastoreTopologyNode & Record<string, unknown>,
  'datastore'
>

export const DatastoreNode = memo(function DatastoreNode({
  data,
  selected,
}: NodeProps<DatastoreFlowNode>) {
  return (
    <TopologyNodeShell
      kindLabel="Datastore"
      title={data.label}
      subtitle={`${String(data.virtualMachineCount)} connected VMs`}
      icon={<GridIcon className="size-5" />}
      iconClassName="bg-warning-50 text-warning-700"
      selected={selected}
      showTargetHandle
    >
      <span className="block pb-1 text-[11px] font-medium text-[#4f6079]">
        {data.allocatedCapacityGb.toLocaleString()} GB allocated
      </span>
    </TopologyNodeShell>
  )
})
