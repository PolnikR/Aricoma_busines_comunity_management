import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { ServerIcon } from '@/shared/icons/Icons'
import type { HostTopologyNode } from '../../model/topologyTypes'
import { TopologyNodeShell } from './TopologyNodeShell'

type HostFlowNode = Node<
  HostTopologyNode & Record<string, unknown>,
  'host'
>

export const HostNode = memo(function HostNode({
  data,
  selected,
}: NodeProps<HostFlowNode>) {
  const clusterLabel = data.clusterNames.length > 0
    ? data.clusterNames.join(', ')
    : 'No cluster'

  return (
    <TopologyNodeShell
      kindLabel="Host"
      title={data.label}
      subtitle={clusterLabel}
      icon={<ServerIcon className="size-5" />}
      iconClassName="bg-blue-light-50 text-blue-light-700"
      selected={selected}
      showTargetHandle
      showSourceHandle
    >
      <span className="text-[11px] font-medium text-[#4f6079]">
        {data.virtualMachineCount} virtual machines
      </span>
    </TopologyNodeShell>
  )
})
