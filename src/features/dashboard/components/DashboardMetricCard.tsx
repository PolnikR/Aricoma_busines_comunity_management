import type { ReactNode } from 'react'
import { ChevronRightIcon } from '@/shared/icons/Icons'

interface DashboardMetricCardProps {
  code: string
  category: string
  title: string
  subtitle: string
  context: string
  status: string
  value: string
  icon: ReactNode
  tone: 'error' | 'warning'
  loading: boolean
  onClick: () => void
}

export function DashboardMetricCard({ code, category, title, subtitle, context, status, value, icon, tone, loading, onClick }: DashboardMetricCardProps) {
  return <button type="button" className={`health-kpi health-kpi--${tone}`} aria-busy={loading || undefined} onClick={onClick}>
    <span className="health-kpi-head">
      <span className="health-kpi-code"><b>{code}</b> / {category}</span>
      <ChevronRightIcon className="health-kpi-arrow" aria-hidden="true" />
    </span>
    <span className="health-kpi-title">{title}</span>
    <span className="health-kpi-description">{subtitle}</span>
    <span className="health-kpi-main">
      <span className={`health-kpi-number${loading ? ' animate-pulse' : ''}`}>{value}</span>
      <span className="health-kpi-icon" aria-hidden="true">{icon}</span>
    </span>
    <span className="health-kpi-footer">
      <span className="health-kpi-context"><span className="health-kpi-dot" />{context}</span>
      <span className={`health-kpi-status${value === '—' ? ' health-kpi-status--unknown' : ''}`}>{status}</span>
    </span>
    <span className="health-kpi-rule" aria-hidden="true" />
  </button>
}
