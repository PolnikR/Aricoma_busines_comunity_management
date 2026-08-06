import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { MonitoringIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import type { ConsistencyGroupTopologyNode } from '../../model/topologyTypes'
import { TopologyNodeShell } from './TopologyNodeShell'
import { ConsistencyGroupNodeTooltip } from './ConsistencyGroupNodeTooltip'
import { useTooltipHover } from '../../hooks/useTooltipHover'

type ConsistencyGroupFlowNode = Node<
  ConsistencyGroupTopologyNode & Record<string, unknown>,
  'consistencyGroup'
>

export const ConsistencyGroupNode = memo(function ConsistencyGroupNode({
  data,
  selected,
}: NodeProps<ConsistencyGroupFlowNode>) {
  const { t } = useTranslation()
  const { showTooltip, nodeRef, handleMouseEnter, handleMouseLeave } = useTooltipHover()

  return (
    <div
      ref={nodeRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      <TopologyNodeShell
        kindLabel={t('topology.flashsystem.consistencyGroup')}
        title={data.label}
        subtitle={data.status}
        icon={<MonitoringIcon className="size-5" />}
        iconClassName="bg-gray-50 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400"
        selected={selected}
        showTargetHandle
        showSourceHandle
      >
        <span className="text-[11px] font-medium text-text-secondary">
          {data.fcMappingCount} {t('tooltip.consistencyGroup.fcMappingCount')}
        </span>
      </TopologyNodeShell>

      {showTooltip ? (
        <ConsistencyGroupNodeTooltip
          nodeRef={nodeRef}
          data={{
            name: data.label,
            status: data.status,
            fcMappingCount: data.fcMappingCount,
            spansPools: data.spansPools,
            poolCount: data.poolCount,
          }}
        />
      ) : null}
    </div>
  )
})
