import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { ServerIcon } from '@/shared/icons/Icons'
import type { HostTopologyNode } from '../../model/topologyTypes'
import { TopologyNodeShell } from './TopologyNodeShell'
import { HostNodeTooltip } from './HostNodeTooltip'
import { useTooltipHover } from '../../hooks/useTooltipHover'
import { useTranslation } from '@/hooks/useTranslation'

type HostFlowNode = Node<
  HostTopologyNode & Record<string, unknown>,
  'host'
>

export const HostNode = memo(function HostNode({
  data,
  selected,
}: NodeProps<HostFlowNode>) {
  const { t } = useTranslation()
  const clusterLabel = data.clusterNames.length > 0
    ? data.clusterNames.join(', ')
    : t('tooltip.host.noCluster')

  const { showTooltip, nodeRef, handleMouseEnter, handleMouseLeave } = useTooltipHover()

  return (
    <div
      ref={nodeRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      <TopologyNodeShell
        kindLabel={t('legend.host')}
        title={data.label}
        subtitle={clusterLabel}
        icon={<ServerIcon className="size-5" />}
        iconClassName="bg-blue-light-50 text-blue-light-700"
        selected={selected}
        showTargetHandle
        showSourceHandle
      >
        <span className="text-[11px] font-medium text-[#4f6079]">
          {data.virtualMachineCount} {t('topology.virtualMachines')}
        </span>
      </TopologyNodeShell>

      {showTooltip ? (
        <HostNodeTooltip
          nodeRef={nodeRef}
          data={{
            name: data.label,
            clusters: data.clusterNames,
            vmCount: data.virtualMachineCount,
          }}
        />
      ) : null}
    </div>
  )
})
