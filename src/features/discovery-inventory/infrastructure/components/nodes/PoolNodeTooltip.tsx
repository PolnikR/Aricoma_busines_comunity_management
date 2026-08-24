import { useTranslation } from '@/hooks/useTranslation'
import { TopologyTooltip, TopologyTooltipField } from './TopologyTooltip'

interface PoolNodeTooltipProps {
  data: {
    name: string
    status: string
    capacity: string
    freeCapacity: string
    volumeCount: number
    encrypt: string
    easyTier: string
  }
  nodeRef: React.RefObject<HTMLElement | null>
}

export function PoolNodeTooltip({ data, nodeRef }: PoolNodeTooltipProps) {
  const { t } = useTranslation()
  return (
    <TopologyTooltip nodeRef={nodeRef} estimatedHeight={180}>
      <div className="space-y-2">
        <TopologyTooltipField label={t('tooltip.pool.name')} value={data.name} />
        <TopologyTooltipField label={t('tooltip.pool.status')} value={data.status} />
        <TopologyTooltipField label={t('tooltip.pool.capacity')} value={data.capacity} />
        <TopologyTooltipField label={t('tooltip.pool.freeCapacity')} value={data.freeCapacity} />
        <TopologyTooltipField label={t('tooltip.pool.volumeCount')} value={String(data.volumeCount)} />
        <TopologyTooltipField label={t('tooltip.pool.encrypt')} value={data.encrypt} />
        <TopologyTooltipField label={t('tooltip.pool.easyTier')} value={data.easyTier} />
      </div>
    </TopologyTooltip>
  )
}

export type { PoolNodeTooltipProps }
