import { useTranslation } from '@/hooks/useTranslation'
import { TopologyTooltip, TopologyTooltipField } from './TopologyTooltip'

interface VMNodeTooltipProps {
  data: {
    name: string
    status: string
    cpu?: number
    memory?: number
    disk?: number
    ipAddress?: string
    host?: string
    cluster?: string
    tags?: string[]
  }
  nodeRef: React.RefObject<HTMLElement | null>
}

export function VMNodeTooltip({ data, nodeRef }: VMNodeTooltipProps) {
  const { t } = useTranslation()
  return (
    <TopologyTooltip nodeRef={nodeRef} estimatedHeight={220}>
      <div className="space-y-2">
        <TopologyTooltipField label={t('tooltip.vm.name')} value={data.name} />
        <TopologyTooltipField label={t('tooltip.vm.status')} value={data.status} />
        <TopologyTooltipField label={t('tooltip.vm.cpu')} value={data.cpu !== undefined ? `${String(data.cpu)} ${t('units.cores')}` : '—'} />
        <TopologyTooltipField label={t('tooltip.vm.memory')} value={data.memory !== undefined ? `${String(data.memory)} ${t('units.gb')}` : '—'} />
        <TopologyTooltipField label={t('tooltip.vm.disk')} value={data.disk !== undefined ? `${String(data.disk)} ${t('units.gb')}` : '—'} />
        <TopologyTooltipField label={t('tooltip.vm.ip')} value={data.ipAddress ?? '—'} />
        <TopologyTooltipField label={t('tooltip.vm.host')} value={data.host ?? '—'} />
        <TopologyTooltipField label={t('tooltip.vm.cluster')} value={data.cluster ?? '—'} />

        {data.tags && data.tags.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-400">{t('tooltip.vm.tags')}</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-block rounded bg-slate-700 px-2 py-1 text-slate-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </TopologyTooltip>
  )
}

export type { VMNodeTooltipProps }
