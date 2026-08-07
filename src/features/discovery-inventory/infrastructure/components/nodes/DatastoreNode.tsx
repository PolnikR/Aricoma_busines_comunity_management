import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { GridIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import type { DatastoreTopologyNode } from '../../model/topologyTypes'
import { TopologyNodeShell } from './TopologyNodeShell'

type DatastoreFlowNode = Node<
  DatastoreTopologyNode & Record<string, unknown>,
  'datastore'
>

export const DatastoreNode = memo(function DatastoreNode({
  data,
  selected,
}: NodeProps<DatastoreFlowNode>) {
  const { t } = useTranslation()
  return (
    <TopologyNodeShell
      kindLabel={t('topology.datastore')}
      title={data.label}
      subtitle={t('topology.datastoreConnectedVMs', { count: data.virtualMachineCount })}
      icon={<GridIcon className="size-5" />}
      iconClassName="bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400"
      selected={selected}
      showTargetHandle
    >
      <span className="block pb-1 text-[11px] font-medium text-text-secondary">
        {t('topology.datastoreAllocatedCapacity', { gb: data.allocatedCapacityGb.toLocaleString() })}
      </span>
    </TopologyNodeShell>
  )
})
