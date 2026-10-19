import { ShieldIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { overallNumber } from '../../model/overallPreviewMetrics'
import { OverallPanel } from './OverallPanel'

export function ProtectionOverview({ scope, stats }: {
  scope: string
  stats: { withSnapshots: number; withoutSnapshots: number; total: number; percent: number }
}) {
  const { t, language } = useTranslation()
  const decimal = new Intl.NumberFormat(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const protectedShare = stats.total ? stats.withSnapshots / stats.total * 100 : 0
  const unprotectedShare = stats.total ? stats.withoutSnapshots / stats.total * 100 : 0
  return <OverallPanel title={t('overview.protection.title')} subtitle={t('overview.protection.subtitle', { scope })} className="overall-protection">
    <div className="overall-protection-chart">
      <div className="overall-donut" role="img" aria-label={t('overview.protection.chart', { percent: stats.percent, withSnapshots: overallNumber(stats.withSnapshots, language), withoutSnapshots: overallNumber(stats.withoutSnapshots, language) })}>
        <svg viewBox="0 0 180 180" aria-hidden="true">
          <circle className="overall-donut-guide" cx="90" cy="90" r="83" />
          <circle className="overall-donut-track" cx="90" cy="90" r="70" />
          <circle className="overall-donut-arc overall-donut-arc-blue" cx="90" cy="90" r="70" pathLength="100" strokeDasharray={[protectedShare, 100 - protectedShare].join(' ')} />
          <circle className="overall-donut-arc overall-donut-arc-amber" cx="90" cy="90" r="70" pathLength="100" strokeDasharray={[unprotectedShare, 100 - unprotectedShare].join(' ')} strokeDashoffset={-protectedShare} />
        </svg>
        <div className="overall-donut-center"><ShieldIcon /><strong>{stats.percent}%</strong><span>{t('overview.protection.coverage')}</span></div>
      </div>
      <div className="overall-protection-legend">
        <div className="overall-legend-row"><span><i className="overall-swatch blue" />{t('overview.protection.withSnapshots')}</span><strong>{overallNumber(stats.withSnapshots, language)}<small>{decimal.format(protectedShare)}%</small></strong></div>
        <div className="overall-legend-row"><span><i className="overall-swatch amber" />{t('overview.protection.withoutSnapshots')}</span><strong>{overallNumber(stats.withoutSnapshots, language)}<small>{decimal.format(unprotectedShare)}%</small></strong></div>
      </div>
    </div>
  </OverallPanel>
}
