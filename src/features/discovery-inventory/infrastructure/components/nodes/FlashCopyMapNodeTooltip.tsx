import { useTranslation } from '@/hooks/useTranslation'
import { TopologyTooltip, TopologyTooltipField } from './TopologyTooltip'

interface FlashCopyMapNodeTooltipProps {
  data: {
    name: string
    status: string
    progress: string
    copyRate: string
    sourceVolumeName: string
    targetVolumeName: string
  }
  nodeRef: React.RefObject<HTMLElement | null>
}

export function FlashCopyMapNodeTooltip({ data, nodeRef }: FlashCopyMapNodeTooltipProps) {
  const { t } = useTranslation()
  return (
    <TopologyTooltip nodeRef={nodeRef} estimatedHeight={180}>
      <div className="space-y-2">
        <TopologyTooltipField label={t('tooltip.fcmap.name')} value={data.name} />
        <TopologyTooltipField label={t('tooltip.fcmap.status')} value={data.status} />
        <TopologyTooltipField label={t('tooltip.fcmap.progress')} value={`${data.progress}%`} />
        <TopologyTooltipField label={t('tooltip.fcmap.copyRate')} value={data.copyRate} />
        <TopologyTooltipField label={t('tooltip.fcmap.source')} value={data.sourceVolumeName} />
        <TopologyTooltipField label={t('tooltip.fcmap.target')} value={data.targetVolumeName} />
      </div>
    </TopologyTooltip>
  )
}

export type { FlashCopyMapNodeTooltipProps }
