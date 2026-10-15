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
      : <div className="issue-distribution-content">
          <div className="issue-distribution-main">
            <div className="issue-distribution-stack" role="img" aria-label={t('dashboard.issuesDistributionLabel', { total: number.format(total) })}>
              {parts.map(part => <span key={part.key} className={`issue-segment issue-segment--${part.className}`} style={{ width: `${String(part.count / total * 100)}%` }} />)}
            </div>
            <div className="issue-distribution-percentages">
              {parts.map(part => <div key={part.key} className={`issue-share issue-share--${part.className}`}>
                <strong>{percent(part.count)}</strong>
                <span>{t(`dashboard.${part.key}`)}</span>
              </div>)}
            </div>
          </div>
          <p className="issue-distribution-note">{t('dashboard.issuesDistributionNote', { total: number.format(total) })}</p>
        </div>}
  </DashboardPanel>
}
