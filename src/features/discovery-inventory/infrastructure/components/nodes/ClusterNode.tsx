import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { LayersIcon } from '@/shared/icons/Icons'
import type { ClusterTopologyNode } from '../../model/topologyTypes'
import { TopologyNodeShell } from './TopologyNodeShell'
import { ClusterNodeTooltip } from './ClusterNodeTooltip'
import { useTooltipHover } from '../../hooks/useTooltipHover'
import { useTranslation } from '@/hooks/useTranslation'

type ClusterFlowNode = Node<
  ClusterTopologyNode & Record<string, unknown>,
  'cluster'
>

export const ClusterNode = memo(function ClusterNode({
  data,
  selected,
}: NodeProps<ClusterFlowNode>) {
  const { showTooltip, nodeRef, handleMouseEnter, handleMouseLeave } = useTooltipHover()
  const { t } = useTranslation()

  return (
    <div
      ref={nodeRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      <TopologyNodeShell
        kindLabel={t('legend.cluster')}
        title={data.label}
        subtitle={t('topology.computeCluster')}
        icon={<LayersIcon className="size-5" />}
        iconClassName="bg-brand-50 text-brand-600"
        selected={selected}
        showSourceHandle
      >
        <span className="text-[11px] font-medium text-text-secondary">
          {data.hostCount} {t(data.hostCount === 1 ? 'tooltip.cluster.hostSingular' : 'tooltip.cluster.hostPlural')}
        </span>
      </TopologyNodeShell>

      {showTooltip ? (
        <ClusterNodeTooltip
          nodeRef={nodeRef}
          data={{
            name: data.label,
            description: t('topology.computeCluster'),
            hostCount: data.hostCount,
          }}
        />
      ) : null}
    </div>
  )
})
