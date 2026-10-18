import { GridIcon, LayersIcon, ServerIcon, ShieldIcon } from '@/shared/icons/Icons'
import type { ReactNode } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import type { OverallPreviewData } from '../../model/overallPreviewMetrics'
import { overallNumber } from '../../model/overallPreviewMetrics'

function Bar({ values, tones }: { values: number[]; tones: string[] }) {
  return <div className="overall-kpi-track" aria-hidden="true">
    {values.map((value, i) => <span key={i} style={{ flex: value, background: tones[i] }} />)}
  </div>
}
function Card({ title, value, unit, icon, children, progress }: {
  title: string; value: number; unit: string; icon: ReactNode; children: ReactNode; progress?: ReactNode
}) {
  const { language } = useTranslation()
  return <article className="overall-kpi">
    <div className="overall-kpi-title"><span>{title}</span><span className="overall-kpi-icon">{icon}</span></div>
    <div className="overall-kpi-value"><strong>{overallNumber(value, language)}</strong><span>{unit}</span></div>
    {progress}
    <div className="overall-kpi-foot">{children}</div>
  </article>
}
export function OverallKpis({ data, protection }: { data: OverallPreviewData; protection: { withSnapshots: number; total: number; withoutSnapshots: number } }) {
  const { t, language } = useTranslation()
  const totalProviders = data.providers.reduce((sum, item) => sum + item.total, 0)
  const groups = data.groups.local + data.groups.remote
  const apps = data.applications.vmware + data.applications.power
  return <section className="overall-kpis" aria-label={t('overview.keyStatistics')}>
    <Card title={t('overview.registeredProviders')} value={totalProviders} unit={t(`overview.providers.${new Intl.PluralRules(language).select(totalProviders)}`)} icon={<ServerIcon />}><span className="overall-kpi-chip">{t('overview.technologies', { count: data.providers.length })}</span> VMware · Power · IBM · Hitachi</Card>
    <Card title={t('overview.volumesWithSnapshots')} value={protection.withSnapshots} unit={`/ ${overallNumber(protection.total, language)}`} icon={<ShieldIcon />} progress={<Bar values={[protection.withSnapshots, protection.withoutSnapshots]} tones={['var(--overall-blue)', 'var(--overall-amber)']} />}>{t('overview.withoutSnapshotSelected', { count: overallNumber(protection.withoutSnapshots, language) })}</Card>
    <Card title={t('overview.recoveryGroups')} value={groups} unit={t('overview.groups')} icon={<LayersIcon />} progress={<Bar values={[data.groups.local, data.groups.remote]} tones={['var(--overall-blue)', 'var(--overall-teal)']} />}>{t('overview.groupDistribution', { local: data.groups.local, remote: data.groups.remote })}</Card>
    <Card title={t('overview.recoveryApplications')} value={apps} unit={t('overview.apps')} icon={<GridIcon />} progress={<Bar values={[data.applications.vmware, data.applications.power]} tones={['var(--overall-blue)', 'var(--overall-teal)']} />}>{data.applications.vmware} VMware · {data.applications.power} IBM Power</Card>
  </section>
}
