import { useTranslation } from '@/hooks/useTranslation'
import type { DashboardCounts, DashboardState, DashboardIssueKind, DashboardDensity } from '../model/dashboardTypes'
import { DashboardMetricCard } from './DashboardMetricCard'

const icons = {
  failedSnapshotJobs: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M7 8h10M7 12h5"/><path className="health-kpi-fault" d="m10 16 5 5m0-5-5 5"/></svg>,
  metroMirrorIssues: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7v5h-5M4 17v-5h5M5.5 9a7.5 7.5 0 0 1 13-2L20 7M18.5 15a7.5 7.5 0 0 1-13 2L4 17"/><path className="health-kpi-fault" d="M5 4.5 19 19.5"/></svg>,
  connectionFailures: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v4M14 3v4M6 7h10v4a5 5 0 0 1-10 0V7ZM11 16v5"/><path className="health-kpi-fault" d="m17 16 5 5m0-5-5 5"/></svg>,
  missingVolumes: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="M2.5 14h19M6.5 17h.01"/><path className="health-kpi-fault" d="m13 7 5 5m0-5-5 5"/></svg>,
}

const cards = [
  { key: 'failedSnapshotJobs', code: '01', tone: 'error', status: 'failed' },
  { key: 'metroMirrorIssues', code: '02', tone: 'warning', status: 'issues' },
  { key: 'connectionFailures', code: '03', tone: 'error', status: 'failed' },
  { key: 'missingVolumes', code: '04', tone: 'warning', status: 'missing' },
] as const

export function DashboardSummary({ counts, state, density, onSelect }: { counts: DashboardCounts | null; state: DashboardState; density: DashboardDensity; onSelect: (key: DashboardIssueKind) => void }) {
  const { t, language } = useTranslation()
  return <section className="kpis health-kpis" data-density={density} aria-label={t('dashboard.indicators')}>
    {cards.map(card => <DashboardMetricCard
      key={card.key}
      code={card.code}
      category={t(`dashboard.${card.key}Category`)}
      title={t(`dashboard.${card.key}`)}
      subtitle={t(`dashboard.${card.key}Subtitle`)}
      context={t(`dashboard.${card.key}Context`)}
      status={t(`dashboard.status.${counts ? counts[card.key] === 0 ? 'clear' : card.status : 'unknown'}`)}
      signalStatus={!counts ? 'unknown' : counts[card.key] === 0 ? 'clear' : 'issue'}
      value={counts ? new Intl.NumberFormat(language).format(counts[card.key]) : '—'}
      loading={state === 'loading'}
      tone={card.tone}
      icon={icons[card.key]}
      onClick={() => { onSelect(card.key) }}
    />)}
  </section>
}
