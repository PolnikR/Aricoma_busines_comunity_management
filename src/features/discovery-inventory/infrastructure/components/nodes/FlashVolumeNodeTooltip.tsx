import { useTranslation } from '@/hooks/useTranslation'
import { TopologyTooltip, TopologyTooltipField } from './TopologyTooltip'

interface FlashVolumeNodeTooltipProps {
  data: {
    name: string
    status: string
    capacity: string
    role: 'source' | 'target' | null
    isSnapshotTarget: boolean
    hasSnapshots: boolean
    snapshotCount: number
    mdiskGroupName: string
  }
  nodeRef: React.RefObject<HTMLElement | null>
}

export function FlashVolumeNodeTooltip({ data, nodeRef }: FlashVolumeNodeTooltipProps) {
  const { t } = useTranslation()
  return (
    <TopologyTooltip nodeRef={nodeRef} estimatedHeight={200}>
      <div className="space-y-2">
        <TopologyTooltipField label={t('tooltip.volume.name')} value={data.name} />
        <TopologyTooltipField label={t('tooltip.volume.status')} value={data.status} />
        <TopologyTooltipField label={t('tooltip.volume.capacity')} value={data.capacity} />
        <TopologyTooltipField label={t('tooltip.volume.pool')} value={data.mdiskGroupName} />
        {data.role ? (
          <TopologyTooltipField
            label={t('tooltip.volume.role')}
            value={data.role === 'source' ? t('tooltip.volume.roleSource') : t('tooltip.volume.roleTarget')}
          />
        ) : null}
        <TopologyTooltipField
          label={t('tooltip.volume.snapshots')}
          value={data.hasSnapshots ? String(data.snapshotCount) : t('tooltip.volume.noSnapshots')}
        />
        {data.isSnapshotTarget ? (
          <TopologyTooltipField label={t('tooltip.volume.isSnapshotTarget')} value={t('tooltip.volume.yes')} />
        ) : null}
      </div>
    </TopologyTooltip>
  )
}

export type { FlashVolumeNodeTooltipProps }
