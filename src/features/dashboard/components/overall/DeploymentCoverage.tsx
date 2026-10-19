import type { OverallPreviewData } from '../../model/overallPreviewMetrics'
import { useTranslation } from '@/hooks/useTranslation'
import { FlaskIcon, ServerIcon } from '@/shared/icons/Icons'
import { OverallPanel } from './OverallPanel'

function CoverageTrack({ title, pushed, total, tone }: { title: string; pushed: number; total: number; tone: 'blue' | 'teal' }) {
  const { t } = useTranslation()
  return <div className="overall-deployment-metric">
    <div className="overall-deployment-label"><span>{title}</span><strong>{pushed} <small>/ {total} {t('overview.apps')}</small></strong></div>
    <div className="overall-deployment-track" role="progressbar" aria-label={t('overview.deployment.chart', { title })} aria-valuemin={0} aria-valuemax={total} aria-valuenow={pushed}>
      <span style={{ width: String(total ? pushed / total * 100 : 0) + '%', background: `var(--overall-${tone})` }} />
    </div>
  </div>
}
export function DeploymentCoverage({ data }: { data: OverallPreviewData }) {
  const { t } = useTranslation()
  return <OverallPanel title={t('overview.deployment.title')} subtitle={t('overview.deployment.subtitle')} className="overall-deployment">
    <div className="overall-deployment-grid">
      <CoverageTrack title="VMware" {...data.deployment.vmware} tone="blue" />
      <CoverageTrack title="IBM Power" {...data.deployment.power} tone="teal" />
      <div className="overall-deployment-summary">
        <div className="overall-deployment-environment"><span className="overall-deployment-icon"><ServerIcon /></span><span>{t('overview.deployment.production')}<strong>{data.deployment.production.pushed} / {data.deployment.production.total}</strong></span></div>
        <div className="overall-deployment-environment"><span className="overall-deployment-icon"><FlaskIcon /></span><span>{t('overview.deployment.test')}<strong>{data.deployment.test.pushed} / {data.deployment.test.total}</strong></span></div>
      </div>
    </div>
  </OverallPanel>
}
