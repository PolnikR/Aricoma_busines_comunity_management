import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { RefreshIcon } from '@/shared/icons/Icons'
import { Button } from '@/shared/components/button/Button'
import { Modal } from '@/shared/components/modal/Modal'
import { DashboardSummary } from '../components/DashboardSummary'
import { dashboardFixture } from '../mocks/dashboardFixtures'
import { selectDashboardMetrics } from '../model/selectDashboardMetrics'
import { RequiresAttention } from '../components/RequiresAttention'
import { RecoveryTopologyDonut } from '../components/RecoveryTopologyDonut'
import { RecentActivity } from '../components/RecentActivity'
import { InfrastructureOverview } from '../components/InfrastructureOverview'
import type { DashboardData, DashboardDensity, DashboardDetail, DashboardState } from '../model/dashboardTypes'
import './overview.css'
import './dashboard-kpi.css'

const DENSITY_STORAGE_KEY = 'abco.dashboard.kpiDensity'
const densityOptions: DashboardDensity[] = ['auto', 'compact', 'spacious']

export function OverviewPage({ data = dashboardFixture, initialState = 'demo' }: { data?: DashboardData; initialState?: DashboardState }) {
  const { t } = useTranslation()
  const [state, setState] = useState<DashboardState>(initialState)
  const [refreshed, setRefreshed] = useState(false)
  const [detail, setDetail] = useState<DashboardDetail | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [density, setDensity] = useState<DashboardDensity>(() => {
    try {
      const saved = window.localStorage.getItem(DENSITY_STORAGE_KEY)
      return densityOptions.find(option => option === saved) ?? 'auto'
    } catch {
      return 'auto'
    }
  })
  const selectDensity = (next: DashboardDensity) => {
    setDensity(next)
    try { window.localStorage.setItem(DENSITY_STORAGE_KEY, next) } catch { /* Storage may be unavailable. */ }
  }
  const empty = state === 'empty'
  const counts = selectDashboardMetrics(state === 'unknown' || state === 'loading' ? null : empty ? { issues: [], groups: [], incidents: [], activity: [], infrastructure: [] } : data)
  const show = (titleKey: string, descriptionKey: string, object?: string) => {
    setDetail({ titleKey, descriptionKey: state === 'empty' || state === 'unknown' || state === 'loading' ? state : descriptionKey, ...(object ? { object } : {}) })
  }
  const states: { value: DashboardState; label: string }[] = [{ value: 'demo', label: 'demoOption' }, { value: 'loading', label: 'loadingOption' }, { value: 'empty', label: 'emptyOption' }, { value: 'partial', label: 'partialOption' }, { value: 'unknown', label: 'unknownOption' }]
  return <div className="dashboard-host flex min-h-full min-w-0 flex-1 flex-col lg:h-full lg:min-h-0"><div className="operations-dashboard">
    <div className="page-head"><div><h1>{t('dashboard.title')}</h1><p className="page-subtitle">{t('dashboard.subtitle')}</p></div><div className="head-actions"><div className="density-switch" role="group" aria-label={t('dashboard.density')}>
      {densityOptions.map(option => <button type="button" key={option} className="density-option" aria-pressed={density === option} onClick={() => { selectDensity(option) }}>{t(`dashboard.density.${option}`)}</button>)}
    </div><button type="button" className="demo-tag" onClick={() => { setPreviewOpen(true) }}>{t('dashboard.demo')}</button><span className="update-state" role="status"><span className="update-dot" /><span>{t(refreshed ? 'dashboard.unchanged' : 'dashboard.snapshot')}</span></span><button type="button" className="refresh" onClick={() => { setState('demo'); setRefreshed(true) }}><RefreshIcon className="icon" />{t('dashboard.refresh')}</button></div></div>
    <DashboardSummary counts={counts} state={state} density={density} onSelect={key => { show(key, `${key}Detail`) }} />
    <div className="board">
      <RequiresAttention incidents={empty ? [] : data.incidents} state={state} onDetail={incident => { show(incident.titleKey, incident.detailKey, incident.object) }} onViewAll={() => { show('attention', 'issuesDetail') }} />
      <RecoveryTopologyDonut counts={counts} state={state} />
      <RecentActivity events={empty ? [] : data.activity} state={state} onDetail={event => { show(event.titleKey, event.detailKey, event.object) }} onViewAll={() => { show('activity', 'activityDetail') }} />
      <InfrastructureOverview resources={empty ? [] : data.infrastructure} state={state} onDetail={resource => { show(resource.titleKey, state === 'partial' && resource.id === 'hitachi' ? 'partial' : resource.detailKey) }} />
    </div>
    <Modal open={detail !== null} onClose={() => { setDetail(null) }} title={detail ? t(`dashboard.${detail.titleKey}`) : ''} footer={<Button variant="outline" onClick={() => { setDetail(null) }}>{t('dashboard.close')}</Button>} className="w-[calc(100%-2rem)]">
      {detail ? <div className="dashboard-detail p-6 text-sm"><p className="leading-6 text-text-secondary">{t(`dashboard.${detail.descriptionKey}`)}</p>{detail.object ? <p className="mt-3 break-words rounded-lg bg-surface-muted p-3 font-mono text-xs">{detail.object}</p> : null}<p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-text-muted">{t('dashboard.caption')}</p></div> : null}
    </Modal>
    <Modal open={previewOpen} onClose={() => { setPreviewOpen(false) }} title={t('dashboard.demo')} footer={<Button variant="outline" onClick={() => { setPreviewOpen(false) }}>{t('dashboard.close')}</Button>} className="w-[calc(100%-2rem)]">
      <div className="p-6"><p className="text-sm leading-6 text-text-secondary">{t('dashboard.caption')}</p>{import.meta.env.DEV ? <label className="mt-4 block text-sm font-medium">{t('dashboard.preview')}<select className="mt-2 block w-full rounded-lg border border-border bg-control p-2 text-text-primary" value={state} onChange={event => { const next = states.find(option => option.value === event.target.value); if (next) setState(next.value) }}>{states.map(option => <option key={option.value} value={option.value}>{t(`dashboard.${option.label}`)}</option>)}</select></label> : null}</div>
    </Modal>
  </div></div>
}
