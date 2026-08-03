import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { CpuIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'
import type { VirtualMachineTopologyNode } from '../../model/topologyTypes'
import { TopologyNodeShell } from './TopologyNodeShell'
import { VMNodeTooltip } from './VMNodeTooltip'
import { useTooltipHover } from '../../hooks/useTooltipHover'
import { useTranslation } from '@/hooks/useTranslation'

type VirtualMachineFlowNode = Node<
  VirtualMachineTopologyNode & Record<string, unknown>,
  'virtualMachine'
>

export const VirtualMachineNode = memo(function VirtualMachineNode({
  data,
  selected,
}: NodeProps<VirtualMachineFlowNode>) {
  const poweredOn = data.powerState === 'poweredOn'
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
        kindLabel={t('legend.vm')}
        title={data.label}
        subtitle={data.hostName}
        icon={<CpuIcon className="size-5" />}
        iconClassName={poweredOn
          ? 'bg-success-50 text-success-700'
          : 'bg-surface-muted text-text-muted'}
        selected={selected}
        showTargetHandle
        showSourceHandle
      >
        <span className="flex items-center justify-between gap-2 text-[10px]">
          <span className={cn(
            'inline-flex items-center gap-1.5 font-semibold',
            poweredOn ? 'text-success-700 dark:text-success-400' : 'text-text-muted',
          )}>
            <span className={cn(
              'size-1.5 rounded-full',
              poweredOn ? 'bg-success-500' : 'bg-text-subtle',
            )}
            />
            {t(poweredOn ? 'topology.filters.poweredOn' : 'topology.filters.poweredOff')}
          </span>
          <span className="truncate text-text-muted">{data.connectionState}</span>
        </span>
      </TopologyNodeShell>

      {showTooltip ? (
        <VMNodeTooltip
          nodeRef={nodeRef}
          data={{
            name: data.label,
            status: data.powerState,
            cpu: data.vcpu,
            memory: data.memoryGb,
            host: data.hostName,
            cluster: data.clusterName,
            // Note: disk, ipAddress, and tags are not currently in VirtualMachineTopologyNode
            // If these fields are added to the topology type, they can be passed here
          }}
        />
      ) : null}
    </div>
  )
})
