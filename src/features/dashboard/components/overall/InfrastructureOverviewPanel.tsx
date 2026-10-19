import type { OverallPreviewData } from '../../model/overallPreviewMetrics'
import { useTranslation } from '@/hooks/useTranslation'
import { OverallPanel } from './OverallPanel'

export function InfrastructureOverviewPanel({ data }: { data: OverallPreviewData }) {
  const { t, language } = useTranslation()
  return <OverallPanel title={t('overview.infrastructure.title')} subtitle={t('overview.infrastructure.subtitle')} className="overall-infrastructure">
    <div className="overall-infrastructure-grid">
      {data.providers.map(provider => {
        const healthy = provider.available === provider.total
        return <article className="overall-resource" key={provider.id}>
          <div className="overall-resource-top">
            <span className={`overall-resource-symbol ${provider.id}`}>{provider.symbol}</span>
            <span className="overall-resource-name"><strong>{provider.name}</strong><small>{t(provider.kind === 'COMPUTE PLATFORM' ? 'overview.infrastructure.compute' : 'overview.infrastructure.storage')}</small></span>
            <span className={`overall-resource-status ${healthy ? 'good' : 'warn'}`}>{t(healthy ? 'overview.infrastructure.available' : 'overview.infrastructure.attention')}</span>
          </div>
          <div className="overall-resource-count"><span><strong>{provider.total}</strong> {t(`overview.providers.${new Intl.PluralRules(language).select(provider.total)}`)}</span><small>{t('overview.infrastructure.availability', { available: provider.available, total: provider.total })}</small></div>
          <div className="overall-resource-meter" role="img" aria-label={t('overview.infrastructure.chart', { name: provider.name, available: provider.available, total: provider.total })}>
            {Array.from({ length: provider.total }, (_, index) => <span key={index} className={index < provider.available ? 'available' : 'offline'} />)}
          </div>
        </article>
      })}
    </div>
  </OverallPanel>
}
