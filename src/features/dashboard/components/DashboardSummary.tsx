import { ShieldIcon, RefreshIcon, PlugIcon, DiskIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import type { DashboardCounts, DashboardState, DashboardIssueKind } from '../model/dashboardTypes'
import { DashboardMetricCard } from './DashboardMetricCard'

export function DashboardSummary({ counts, state, onSelect }: { counts: DashboardCounts | null; state: DashboardState; onSelect: (key: DashboardIssueKind) => void }) {
  const { t, language } = useTranslation()
  const cards = [{ key: 'protectionAtRisk' as const, tone: 'red', icon: <ShieldIcon className="icon" /> }, { key: 'replicationIssues' as const, tone: 'orange', icon: <RefreshIcon className="icon" /> }, { key: 'connectionFailures' as const, tone: 'red', icon: <PlugIcon className="icon" /> }, { key: 'inventoryIssues' as const, tone: 'orange', icon: <DiskIcon className="icon" /> }]
  return <section className="kpis" aria-label={t('dashboard.indicators')}>{cards.map(card => <DashboardMetricCard key={card.key} title={t(`dashboard.${card.key}`)} subtitle={t(`dashboard.${card.key}Subtitle`)} context={t(`dashboard.${card.key}Context`)} value={counts ? new Intl.NumberFormat(language).format(counts[card.key]) : '—'} loading={state === 'loading'} tone={card.tone} icon={card.icon} onClick={() => { onSelect(card.key) }} />)}</section>
}
