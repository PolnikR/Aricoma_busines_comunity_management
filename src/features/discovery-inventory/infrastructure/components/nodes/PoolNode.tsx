import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { GridIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import type { PoolTopologyNode } from '../../model/topologyTypes'
import { TopologyNodeShell } from './TopologyNodeShell'
import { PoolNodeTooltip } from './PoolNodeTooltip'
import { useTooltipHover } from '../../hooks/useTooltipHover'

type PoolFlowNode = Node<
  PoolTopologyNode & Record<string, unknown>,
  'pool'
>

export const PoolNode = memo(function PoolNode({
  data,
  selected,
}: NodeProps<PoolFlowNode>) {
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
        kindLabel={t('topology.flashsystem.pool')}
        title={data.label}
        subtitle={data.capacity}
        icon={<GridIcon className="size-5" />}
        iconClassName="bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400"
        selected={selected}
        showSourceHandle
      >
        <span className="text-[11px] font-medium text-text-secondary">
          {data.volumeCount} {t('topology.flashsystem.volumes')}
        </span>
      </TopologyNodeShell>

      {showTooltip ? (
        <PoolNodeTooltip
          nodeRef={nodeRef}
          data={{
            name: data.label,
            status: data.status,
            capacity: data.capacity,
            freeCapacity: data.freeCapacity,
            volumeCount: data.volumeCount,
            encrypt: data.encrypt,
            easyTier: data.easyTier,
          }}
        />
      ) : null}
    </div>
  )
})
