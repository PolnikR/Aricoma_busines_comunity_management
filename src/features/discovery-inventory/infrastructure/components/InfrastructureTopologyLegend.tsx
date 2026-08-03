import { useTranslation } from '@/hooks/useTranslation'
import type { InfrastructureTopologyPlatform } from '../model/topologyTypes'

interface InfrastructureTopologyLegendProps {
  platform: InfrastructureTopologyPlatform
  visibleNodes: number
  visibleEdges: number
}

export function InfrastructureTopologyLegend({
  platform,
  visibleNodes,
  visibleEdges,
}: InfrastructureTopologyLegendProps) {
  const { t } = useTranslation()
  const isPower = platform === 'ibm-power'
  const nodeKinds = isPower
    ? [
        { label: t('topology.power.managedSystem'), className: 'bg-brand-500' },
        { label: 'LPAR', className: 'bg-blue-light-500' },
        { label: 'VIOS', className: 'bg-warning-500' },
      ]
    : [
        { label: t('legend.cluster'), className: 'bg-brand-500' },
        { label: t('legend.host'), className: 'bg-blue-light-500' },
        { label: t('legend.vm'), className: 'bg-success-500' },
        { label: t('legend.datastore'), className: 'bg-warning-500' },
      ]
  return (
    <div className="flex flex-col gap-2 border-t border-border bg-surface px-4 py-2.5 text-[11px] text-text-muted sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label={t('legend.ariaLabel')}>
        {nodeKinds.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span className={`size-2 rounded-sm ${item.className}`} />
            {item.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className={isPower ? 'w-5 border-t border-border-strong' : 'w-5 border-t border-dashed border-border-strong'} />
          {t(isPower ? 'topology.power.containmentRelation' : 'legend.datastoreRelation')}
        </span>
      </div>
      <span className="shrink-0 font-medium text-text-secondary">
        {visibleNodes} {t('legend.statisticsNodes')} / {visibleEdges} {t('legend.statisticsRelations')}
      </span>
    </div>
  )
}
