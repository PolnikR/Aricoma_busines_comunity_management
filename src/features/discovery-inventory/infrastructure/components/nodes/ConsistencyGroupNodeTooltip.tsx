import { useTranslation } from '@/hooks/useTranslation'
import { TopologyTooltip, TopologyTooltipField } from './TopologyTooltip'

interface ConsistencyGroupNodeTooltipProps {
  data: {
    name: string
    status: string
    fcMappingCount: number
    spansPools: boolean
    poolCount: number
  }
  nodeRef: React.RefObject<HTMLElement | null>
}

export function ConsistencyGroupNodeTooltip({ data, nodeRef }: ConsistencyGroupNodeTooltipProps) {
  const { t } = useTranslation()
  return (
    <TopologyTooltip nodeRef={nodeRef} estimatedHeight={160}>
      <div className="space-y-2">
        <TopologyTooltipField label={t('tooltip.consistencyGroup.name')} value={data.name} />
        <TopologyTooltipField label={t('tooltip.consistencyGroup.status')} value={data.status} />
        <TopologyTooltipField label={t('tooltip.consistencyGroup.fcMappingCount')} value={String(data.fcMappingCount)} />
        <TopologyTooltipField label={t('tooltip.consistencyGroup.pools')} value={String(data.poolCount)} />
        <TopologyTooltipField
          label={t('tooltip.consistencyGroup.spansPools')}
          value={data.spansPools ? t('tooltip.volume.yes') : t('tooltip.consistencyGroup.no')}
        />
      </div>
    </TopologyTooltip>
  )
}

export type { ConsistencyGroupNodeTooltipProps }
