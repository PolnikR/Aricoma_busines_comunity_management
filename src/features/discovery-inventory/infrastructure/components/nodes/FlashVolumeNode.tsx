import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { LayersIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'
import { useTranslation } from '@/hooks/useTranslation'
import type { FlashVolumeTopologyNode } from '../../model/topologyTypes'
import { TopologyNodeShell } from './TopologyNodeShell'
import { FlashVolumeNodeTooltip } from './FlashVolumeNodeTooltip'
import { useTooltipHover } from '../../hooks/useTooltipHover'

type FlashVolumeFlowNode = Node<
  FlashVolumeTopologyNode & Record<string, unknown>,
  'volume'
>

export const FlashVolumeNode = memo(function FlashVolumeNode({
  data,
  selected,
}: NodeProps<FlashVolumeFlowNode>) {
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
        kindLabel={t('topology.flashsystem.volume')}
        title={data.label}
        subtitle={data.capacity}
        icon={<LayersIcon className="size-5" />}
        iconClassName="bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/15 dark:text-blue-light-400"
        selected={selected}
        showTargetHandle
        showSourceHandle
      >
        <span className="flex items-center justify-between gap-2 text-[10px]">
          <span className="font-semibold text-text-secondary">{data.status}</span>
          {data.role ? (
            <span className={cn(
              'inline-flex items-center rounded-full px-1.5 py-0.5 font-medium',
              data.role === 'source'
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                : 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400',
            )}>
              {data.role === 'source' ? t('tooltip.volume.roleSource') : t('tooltip.volume.roleTarget')}
            </span>
          ) : null}
        </span>
      </TopologyNodeShell>

      {showTooltip ? (
        <FlashVolumeNodeTooltip
          nodeRef={nodeRef}
          data={{
            name: data.label,
            status: data.status,
            capacity: data.capacity,
            role: data.role,
            isSnapshotTarget: data.isSnapshotTarget,
            hasSnapshots: data.hasSnapshots,
            snapshotCount: data.snapshotCount,
            mdiskGroupName: data.mdiskGroupName,
          }}
        />
      ) : null}
    </div>
  )
})
