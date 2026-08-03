import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { ServerIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import type { PowerSystemTopologyNode } from '../../model/topologyTypes'
import { TopologyNodeShell } from './TopologyNodeShell'

type PowerSystemFlowNode = Node<
  PowerSystemTopologyNode & Record<string, unknown>,
  'powerSystem'
>

export const PowerSystemNode = memo(function PowerSystemNode({
  data,
  selected,
}: NodeProps<PowerSystemFlowNode>) {
  const { t } = useTranslation()

  return (
    <TopologyNodeShell
      kindLabel={t('topology.power.managedSystem')}
      title={data.label}
      subtitle={t('topology.power.systemDescription')}
      icon={<ServerIcon className="size-5" />}
      iconClassName="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
      selected={selected}
      showSourceHandle
    >
      <span className="flex items-center gap-3 text-[11px] font-medium text-text-secondary">
        <span>{data.lparCount} LPAR</span>
        <span>{data.viosCount} VIOS</span>
      </span>
    </TopologyNodeShell>
  )
})
