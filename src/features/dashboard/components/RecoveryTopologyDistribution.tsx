import { ServerIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import type { DashboardCounts, DashboardSnapshotSummary, DashboardState } from '../model/dashboardTypes'
import { DashboardPanel, DashboardStatePlaceholder } from './DashboardPanel'

export function RecoveryTopologyDistribution({ counts, snapshots, state }: { counts: DashboardCounts | null; snapshots?: DashboardSnapshotSummary | undefined; state: DashboardState }) {
  const { t, language } = useTranslation()
  const number = new Intl.NumberFormat(language)
  const percent = (count: number, total: number) => new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 1 }).format(total ? count / total : 0)
  return <DashboardPanel title={t('dashboard.topology')} subtitle={t('dashboard.topologySubtitle')} icon={<ServerIcon className="icon" />}>
    {!counts || state === 'loading' || counts.totalGroups === 0
      ? <DashboardStatePlaceholder state={state === 'demo' || state === 'partial' ? 'empty' : state} />
      : <>
          <div className="console-topology">
            <div className="console-topology-root" role="img" aria-label={t('dashboard.topologyLabel', { total: counts.totalGroups, local: counts.local, metro: counts.metro, localPercent: percent(counts.local, counts.totalGroups), metroPercent: percent(counts.metro, counts.totalGroups) })}>
              <span>{t('dashboard.groupDonutLabel')}</span><strong>{number.format(counts.totalGroups)}</strong>
            </div>
            <dl className="console-topology-branches">{[{ key: 'local', value: counts.local }, { key: 'metro', value: counts.metro }].map(part => <div className="console-topology-node" key={part.key}>
              <dt>{t(`dashboard.${part.key}`)}</dt><dd><strong>{number.format(part.value)}</strong><span>{percent(part.value, counts.totalGroups)}</span></dd>
            </div>)}</dl>
          </div>
          {snapshots ? <dl className="console-stats"><div><dt>{t('dashboard.flashCopyMappings')}</dt><dd>{number.format(snapshots.flashCopyMappings)}</dd></div><div><dt>{t('dashboard.groupsWithSnapshotPolicy')}</dt><dd>{number.format(snapshots.groupsWithSnapshotPolicy)}</dd></div></dl> : null}
        </>}
  </DashboardPanel>
}
