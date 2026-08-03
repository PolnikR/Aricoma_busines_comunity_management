import { useTranslation } from '@/hooks/useTranslation'

interface InfrastructureTopologyLegendProps {
  visibleNodes: number
  visibleEdges: number
}

export function InfrastructureTopologyLegend({
  visibleNodes,
  visibleEdges,
}: InfrastructureTopologyLegendProps) {
  const { t } = useTranslation()
  const nodeKinds = [
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
          <span className="w-5 border-t border-dashed border-border-strong" />
          {t('legend.datastoreRelation')}
        </span>
      </div>
      <span className="shrink-0 font-medium text-text-secondary">
        {visibleNodes} {t('legend.statisticsNodes')} / {visibleEdges} {t('legend.statisticsRelations')}
      </span>
    </div>
  )
}
