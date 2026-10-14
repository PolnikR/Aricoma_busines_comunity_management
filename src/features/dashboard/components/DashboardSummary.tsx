import { AlertTriangleIcon, AlertCircleIcon, ExecutionIcon, EyeIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import type { DashboardCounts, DashboardState, SignalKind } from '../model/dashboardTypes'
import { DashboardMetricCard } from './DashboardMetricCard'

export function DashboardSummary({ counts, state, onSelect }: { counts: DashboardCounts | null; state: DashboardState; onSelect: (key: SignalKind) => void }) {
  const { t, language } = useTranslation()
  const cards = [{ key: 'critical' as const, tone: 'red', icon: <AlertTriangleIcon className="icon" /> }, { key: 'warnings' as const, tone: 'orange', icon: <AlertCircleIcon className="icon" /> }, { key: 'running' as const, tone: 'green', icon: <ExecutionIcon className="icon" /> }, { key: 'unverified' as const, tone: '', icon: <EyeIcon className="icon" /> }]
  return <section className="kpis" aria-label={t('dashboard.indicators')}>{cards.map(card => <DashboardMetricCard key={card.key} title={t(`dashboard.${card.key}`)} subtitle={t(`dashboard.${card.key}Subtitle`)} context={t(`dashboard.${card.key}Context`)} value={counts ? new Intl.NumberFormat(language).format(counts[card.key]) : '—'} loading={state === 'loading'} tone={card.tone} icon={card.icon} onClick={() => { onSelect(card.key) }} />)}</section>
}
