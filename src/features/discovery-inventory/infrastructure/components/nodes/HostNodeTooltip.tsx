import { useTranslation } from '@/hooks/useTranslation'
import { TopologyTooltip, TopologyTooltipField } from './TopologyTooltip'

interface HostNodeTooltipProps {
  data: {
    name: string
    clusters: string[]
    vmCount: number
  }
  nodeRef: React.RefObject<HTMLElement | null>
}

export function HostNodeTooltip({ data, nodeRef }: HostNodeTooltipProps) {
  const { t } = useTranslation()
  return (
    <TopologyTooltip nodeRef={nodeRef} estimatedHeight={140}>
      <div className="space-y-2">
        <TopologyTooltipField label={t('tooltip.host.name')} value={data.name} />
        <TopologyTooltipField label={t('tooltip.host.cluster')} value={data.clusters.length > 0 ? data.clusters.join(', ') : t('tooltip.host.noCluster')} />
        <TopologyTooltipField label={t('tooltip.host.vms')} value={String(data.vmCount)} />
      </div>
    </TopologyTooltip>
  )
}

export type { HostNodeTooltipProps }
