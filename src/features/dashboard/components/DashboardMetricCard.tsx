import type { ReactNode } from 'react'
import { ChevronRightIcon } from '@/shared/icons/Icons'

export function DashboardMetricCard({ title, subtitle, context, value, icon, tone = '', loading = false, onClick }: { title: string; subtitle: string; context: string; value: string; icon: ReactNode; tone?: string; loading?: boolean; onClick: () => void }) {
  return <button type="button" className="kpi" aria-busy={loading || undefined} onClick={onClick}>
    <span className="kpi-top"><span className={`kpi-icon ${tone}`}>{icon}</span><span className="min-w-0"><span className="kpi-label">{title}</span><span className="kpi-description block">{subtitle}</span></span></span>
    <span className="kpi-bottom"><span className={`kpi-number${loading ? ' animate-pulse' : ''}`}>{value}</span><span className="kpi-context">{context}</span><ChevronRightIcon className="icon kpi-arrow" /></span>
  </button>
}
