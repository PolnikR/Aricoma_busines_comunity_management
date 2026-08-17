import { useTranslation } from '@/hooks/useTranslation'
import { TopologyTooltip, TopologyTooltipField } from './TopologyTooltip'

interface ClusterNodeTooltipProps {
  data: {
    name: string
    description: string
    hostCount: number
  }
  nodeRef: React.RefObject<HTMLElement | null>
}

export function ClusterNodeTooltip({ data, nodeRef }: ClusterNodeTooltipProps) {
  const { t } = useTranslation()
  const hostLabel = data.hostCount === 1 ? t('tooltip.cluster.hostSingular') : t('tooltip.cluster.hostPlural')

  return (
    <TopologyTooltip nodeRef={nodeRef} estimatedHeight={120}>
      <div className="space-y-2">
        <TopologyTooltipField label={t('tooltip.cluster.name')} value={data.name} />
        <TopologyTooltipField label={t('tooltip.cluster.description')} value={data.description} />
        <TopologyTooltipField label={t('tooltip.cluster.hosts')} value={`${String(data.hostCount)} ${hostLabel}`} />
      </div>
    </TopologyTooltip>
  )
}

export type { ClusterNodeTooltipProps }
