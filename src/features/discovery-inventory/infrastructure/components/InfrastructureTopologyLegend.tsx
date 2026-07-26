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
    <div className="flex flex-col gap-2 border-t border-[#e3edf6] bg-white px-4 py-2.5 text-[11px] text-[#66758f] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Topology legend">
        {nodeKinds.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span className={`size-2 rounded-sm ${item.className}`} />
            {item.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-5 border-t border-dashed border-[#9aa8bc]" />
          {t('legend.datastoreRelation')}
        </span>
      </div>
      <span className="shrink-0 font-medium text-[#4e5f78]">
        {visibleNodes} {t('legend.statistics').split(' / ')[0]} / {visibleEdges} {t('legend.statistics').split(' / ')[1]}
      </span>
    </div>
  )
}
