import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { LayersIcon } from '@/shared/icons/Icons'
import type { ClusterTopologyNode } from '../../model/topologyTypes'
import { TopologyNodeShell } from './TopologyNodeShell'

type ClusterFlowNode = Node<
  ClusterTopologyNode & Record<string, unknown>,
  'cluster'
>

export const ClusterNode = memo(function ClusterNode({
  data,
  selected,
}: NodeProps<ClusterFlowNode>) {
  return (
    <TopologyNodeShell
      kindLabel="Cluster"
      title={data.label}
      subtitle="Compute cluster"
      icon={<LayersIcon className="size-5" />}
      iconClassName="bg-brand-50 text-brand-600"
      selected={selected}
      showSourceHandle
    >
      <span className="text-[11px] font-medium text-[#4f6079]">
        {data.hostCount} {data.hostCount === 1 ? 'host' : 'hosts'}
      </span>
    </TopologyNodeShell>
  )
})
