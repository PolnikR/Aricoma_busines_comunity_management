import { useTranslation } from '@/hooks/useTranslation'
import { MonitoringIcon } from '@/shared/icons/Icons'
import type { DashboardCounts, DashboardIssueKind, DashboardState } from '../model/dashboardTypes'
import { DashboardPanel, DashboardStatePlaceholder } from './DashboardPanel'

const categories: { key: DashboardIssueKind; className: string }[] = [
  { key: 'failedSnapshotJobs', className: 'snapshots' },
  { key: 'replicationIssues', className: 'replication' },
  { key: 'connectionFailures', className: 'connections' },
  { key: 'missingVolumes', className: 'volumes' },
]

export function IssuesDistribution({ counts, state }: { counts: DashboardCounts | null; state: DashboardState }) {
  const { t, language } = useTranslation()
  const number = new Intl.NumberFormat(language)
  const total = counts ? categories.reduce((sum, category) => sum + counts[category.key], 0) : 0
  const percent = (value: number) => new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 0 }).format(total ? value / total : 0)
  const parts = counts ? categories.map(category => ({ ...category, count: counts[category.key] })) : []

  return <DashboardPanel title={t('dashboard.issuesDistribution')} subtitle={t('dashboard.issuesDistributionSubtitle')} icon={<MonitoringIcon className="icon" />}>
    {!counts || state === 'loading' || total === 0
      ? <DashboardStatePlaceholder state={state === 'demo' || state === 'partial' ? 'empty' : state} />
      : <div className="console-issues">
          <div className="console-issue-total" role="img" aria-label={t('dashboard.issuesDistributionLabel', { total: number.format(total) })}>
            <strong>{number.format(total)}</strong><span>{t('dashboard.console.categoryCounts')}</span>
          </div>
          <table className="console-issue-table" aria-label={t('dashboard.issuesDistributionLabel', { total: number.format(total) })}>
            <thead><tr><th scope="col">{t('dashboard.console.category')}</th><th scope="col">{t('dashboard.console.share')}</th><th scope="col">{t('dashboard.console.count')}</th></tr></thead>
            <tbody>{parts.map(part => <tr key={part.key} className={`issue-share issue-share--${part.className}`}>
              <th scope="row">{t(`dashboard.${part.key}`)}</th>
              <td><div className="console-issue-share"><span className="issue-track" aria-hidden="true"><span className="issue-track-fill" style={{ width: `${String(part.count / total * 100)}%` }} /></span><strong>{percent(part.count)}</strong></div></td>
              <td className="console-issue-count">{number.format(part.count)}</td>
            </tr>)}</tbody>
          </table>
          <p className="console-issue-note">{t('dashboard.issuesDistributionNote', { total: number.format(total) })}</p>
        </div>}
  </DashboardPanel>
}
