import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { CpuIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'
import { useTranslation } from '@/hooks/useTranslation'
import type { PowerPartitionTopologyNode } from '../../model/topologyTypes'
import { TopologyNodeShell } from './TopologyNodeShell'

type PowerPartitionFlowNode = Node<
  PowerPartitionTopologyNode & Record<string, unknown>,
  'powerPartition'
>

export const PowerPartitionNode = memo(function PowerPartitionNode({
  data,
  selected,
}: NodeProps<PowerPartitionFlowNode>) {
  const { t } = useTranslation()
  const normalizedState = data.partitionState.trim().toLowerCase()
  const isRunning = normalizedState === 'running' || normalizedState === 'active'
  const subtitle = data.systemName || data.operatingSystemType || '-'

  return (
    <TopologyNodeShell
      kindLabel={t('topology.power.partition')}
      title={data.label}
      subtitle={subtitle}
      icon={<CpuIcon className="size-5" />}
      iconClassName={data.partitionKind === 'VIOS'
        ? 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-300'
        : 'bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/15 dark:text-blue-light-300'}
      selected={selected}
      showTargetHandle
    >
      <span className="flex items-center justify-between gap-2 text-[10px]">
        <span className="font-semibold text-text-secondary">{data.partitionKind}</span>
        <span className={cn(
          'inline-flex min-w-0 items-center gap-1.5 font-medium',
          isRunning ? 'text-success-700 dark:text-success-400' : 'text-text-muted',
        )}>
          <span className={cn(
            'size-1.5 shrink-0 rounded-full',
            isRunning ? 'bg-success-500' : 'bg-text-subtle',
          )} />
          <span className="truncate">{data.partitionState || '-'}</span>
        </span>
      </span>
    </TopologyNodeShell>
  )
})
