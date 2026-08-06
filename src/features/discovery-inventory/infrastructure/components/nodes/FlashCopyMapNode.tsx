import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { ExecutionIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import type { FlashCopyMapTopologyNode } from '../../model/topologyTypes'
import { TopologyNodeShell } from './TopologyNodeShell'
import { FlashCopyMapNodeTooltip } from './FlashCopyMapNodeTooltip'
import { useTooltipHover } from '../../hooks/useTooltipHover'

type FlashCopyMapFlowNode = Node<
  FlashCopyMapTopologyNode & Record<string, unknown>,
  'fcmap'
>

export const FlashCopyMapNode = memo(function FlashCopyMapNode({
  data,
  selected,
}: NodeProps<FlashCopyMapFlowNode>) {
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
        kindLabel={t('topology.flashsystem.fcmap')}
        title={data.label}
        subtitle={data.status}
        icon={<ExecutionIcon className="size-5" />}
        iconClassName="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
        selected={selected}
        showTargetHandle
        showSourceHandle
      >
        <span className="text-[11px] font-medium text-text-secondary">
          {data.progress}% {t('tooltip.fcmap.progress')}
        </span>
      </TopologyNodeShell>

      {showTooltip ? (
        <FlashCopyMapNodeTooltip
          nodeRef={nodeRef}
          data={{
            name: data.label,
            status: data.status,
            progress: data.progress,
            copyRate: data.copyRate,
            sourceVolumeName: data.sourceVolumeName,
            targetVolumeName: data.targetVolumeName,
          }}
        />
      ) : null}
    </div>
  )
})
