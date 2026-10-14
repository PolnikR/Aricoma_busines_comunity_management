import { useId } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import type { DashboardState } from '../model/dashboardTypes'

export function DashboardPanel({ title, subtitle, icon, attention = false, action, children }: { title: string; subtitle: string; icon: ReactNode; attention?: boolean; action?: ReactNode; children: ReactNode }) {
  const id = useId()
  return <section className="panel dashboard-panel" aria-labelledby={id}>
    <div className="panel-header"><div><div className={`panel-title-wrap${attention ? ' attention' : ''}`}>{icon}<h2 id={id}>{title}</h2></div><p className="panel-subtitle">{subtitle}</p></div>{action}</div>
    {children}
  </section>
}

export function DashboardStatePlaceholder({ state }: { state: DashboardState }) {
  const { t } = useTranslation()
  return <div className={`state-placeholder${state === 'loading' ? ' animate-pulse' : ''}`} role="status" data-state={state} aria-busy={state === 'loading' || undefined}>{t(`dashboard.${state}`)}</div>
}
