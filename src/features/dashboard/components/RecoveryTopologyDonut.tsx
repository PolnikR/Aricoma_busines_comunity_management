import { ServerIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import type { DashboardCounts, DashboardSnapshotSummary, DashboardState } from '../model/dashboardTypes'
import { DashboardPanel, DashboardStatePlaceholder } from './DashboardPanel'

export function RecoveryTopologyDonut({ counts, snapshots, state }: { counts: DashboardCounts | null; snapshots?: DashboardSnapshotSummary | undefined; state: DashboardState }) {
  const { t, language } = useTranslation()
  const number = new Intl.NumberFormat(language)
  const percent = (count: number, total: number) => new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 1 }).format(total ? count / total : 0)
  return <DashboardPanel title={t('dashboard.topology')} subtitle={t('dashboard.topologySubtitle')} icon={<ServerIcon className="icon" />}>
    {!counts || state === 'loading' || counts.totalGroups === 0 ? <DashboardStatePlaceholder state={state === 'demo' ? 'empty' : state} /> : <div className="recovery-chart-with-stats">
      <div className="topology-content">
        <div className="donut" role="img" aria-label={t('dashboard.topologyLabel', { total: counts.totalGroups, local: counts.local, metro: counts.metro, localPercent: percent(counts.local, counts.totalGroups), metroPercent: percent(counts.metro, counts.totalGroups) })} style={{ background: `conic-gradient(var(--app-accent) 0% ${String(counts.local / counts.totalGroups * 100)}%,var(--app-text-primary) ${String(counts.local / counts.totalGroups * 100)}% 100%)` }}><div className="donut-center"><strong>{number.format(counts.totalGroups)}</strong><span>{t('dashboard.groupDonutLabel')}</span></div></div>
        <div className="donut-key">{[{ key: 'local', value: counts.local }, { key: 'metro', value: counts.metro }].map(part => <div className="key-row" key={part.key}><i className={`key-dot${part.key === 'metro' ? ' navy' : ''}`} /><span className="key-name">{t(`dashboard.${part.key}`)}</span><span className="key-count">{number.format(part.value)}</span><span className="key-percent">{percent(part.value, counts.totalGroups)}</span></div>)}</div>
      </div>
      {snapshots ? <div className="recovery-chart-stats">
        <div><strong>{number.format(snapshots.flashCopyMappings)}</strong><span>{t('dashboard.flashCopyMappings')}</span></div>
        <div><strong>{number.format(snapshots.groupsWithSnapshotPolicy)}</strong><span>{t('dashboard.groupsWithSnapshotPolicy')}</span></div>
      </div> : null}
    </div>}
  </DashboardPanel>
}
