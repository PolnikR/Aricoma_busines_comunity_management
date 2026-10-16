import { useEffect, useRef, useState } from 'react'
import { useInitialResourcePrefetch } from '@/features/discovery-inventory/resources/hooks/useInitialResourcePrefetch'
import { useTranslation } from '@/hooks/useTranslation'
import { RefreshIcon } from '@/shared/icons/Icons'
import { Button } from '@/shared/components/button/Button'
import { Modal } from '@/shared/components/modal/Modal'
import { DashboardSummary } from '../components/DashboardSummary'
import { dashboardFixture } from '../mocks/dashboardFixtures'
import { selectDashboardMetrics } from '../model/selectDashboardMetrics'
import { IssuesDistribution } from '../components/IssuesDistribution'
import { RecoveryApplicationsDistribution } from '../components/RecoveryApplicationsDistribution'
import { RecoveryTopologyDistribution } from '../components/RecoveryTopologyDistribution'
import { InfrastructureOverview } from '../components/InfrastructureOverview'
import type { DashboardData, DashboardDensity, DashboardDetail, DashboardState } from '../model/dashboardTypes'
import { useDashboardLayout } from '../hooks/useDashboardLayout'
import './operations-console.css'

const DENSITY_STORAGE_KEY = 'abco.dashboard.kpiDensity'
const densityOptions: DashboardDensity[] = ['auto', 'compact', 'spacious']
type ConsoleSection = 'indicators' | 'applications' | 'topology' | 'issues' | 'infrastructure'

export function OverviewPage({ data = dashboardFixture, initialState = 'demo' }: { data?: DashboardData; initialState?: DashboardState }) {
  const { t } = useTranslation()
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  const layout = useDashboardLayout(host)
  const paged = layout === 'sections'
  const [page, setPage] = useState(0)
  const sectionSelect = useRef<HTMLSelectElement>(null)
  const pageTitle = useRef<HTMLHeadingElement>(null)
  const lastFocused = useRef<HTMLElement | null>(null)
  const pages: { section: ConsoleSection; item?: number; total?: number }[] = [
    ...Array.from({ length: 4 }, (_, item) => ({ section: 'indicators' as const, item, total: 4 })),
    { section: 'issues' }, { section: 'applications' }, { section: 'topology' },
    ...Array.from({ length: Math.max(1, data.infrastructure.length) }, (_, item) => ({ section: 'infrastructure' as const, item, total: data.infrastructure.length })),
  ]
  const activePage = Math.min(page, pages.length - 1)
  const active = pages[activePage] ?? { section: 'indicators', item: 0 }
  const [state, setState] = useState<DashboardState>(initialState)
  useInitialResourcePrefetch(state !== 'loading' && state !== 'unknown')
  const [refreshed, setRefreshed] = useState(false)
  const [detail, setDetail] = useState<DashboardDetail | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  useEffect(() => {
    if (detail || previewOpen) return
    const focused = lastFocused.current
    if (focused && (!focused.isConnected || focused.closest('[hidden]'))) {
      if (paged) sectionSelect.current?.focus()
      else pageTitle.current?.focus()
    }
  }, [detail, previewOpen, layout, paged])
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
  return <div className="dashboard-host" ref={setHost} onFocusCapture={event => { if (event.target instanceof HTMLElement) lastFocused.current = event.target }}><div className="operations-dashboard operations-console" data-layout={layout}>
    <div className="page-head"><div><h1 ref={pageTitle} tabIndex={-1}>{t('dashboard.title')}</h1><p className="page-subtitle">{t('dashboard.subtitle')}</p></div><div className="head-actions"><div className="density-switch" role="group" aria-label={t('dashboard.density')}>
      {densityOptions.map(option => <button type="button" key={option} className="density-option" aria-pressed={density === option} onClick={() => { selectDensity(option) }}>{t(`dashboard.density.${option}`)}</button>)}
    </div><button type="button" className="demo-tag" onClick={() => { setPreviewOpen(true) }}>{t('dashboard.demo')}</button><span className="update-state" role="status"><span className="update-dot" /><span>{t(refreshed ? 'dashboard.unchanged' : 'dashboard.snapshot')}</span></span><button type="button" className="refresh" onClick={() => { setState('demo'); setRefreshed(true) }}><RefreshIcon className="icon" />{t('dashboard.refresh')}</button></div></div>
    <nav className="console-section-nav" aria-label={t('dashboard.console.section')} hidden={!paged}>
      <button type="button" aria-label={t('dashboard.console.previous')} disabled={activePage === 0} onClick={() => { setPage(activePage - 1) }}>←</button>
      <select ref={sectionSelect} aria-label={t('dashboard.console.section')} value={activePage} onChange={event => { setPage(Number(event.target.value)) }}>
        {pages.map((entry, index) => <option key={`${entry.section}-${String(entry.item ?? 0)}`} value={index}>{t(`dashboard.console.${entry.section}`)}{entry.item === undefined ? '' : ` · ${t('dashboard.console.position', { current: entry.item + 1, total: entry.total ?? 1 })}`}</option>)}
      </select>
      <span className="console-page-position" role="status">{t('dashboard.console.position', { current: activePage + 1, total: pages.length })}</span>
      <button type="button" aria-label={t('dashboard.console.next')} disabled={activePage === pages.length - 1} onClick={() => { setPage(activePage + 1) }}>→</button>
    </nav>
    <div className="console-indicators" hidden={paged && active.section !== 'indicators'}>
      <DashboardSummary counts={counts} state={state} density={density} activeIndex={paged ? active.item : undefined} onSelect={key => { show(key, `${key}Detail`) }} />
    </div>
    <div className="board">
      <div className="console-slot" data-section="applications" hidden={paged && active.section !== 'applications'}><RecoveryApplicationsDistribution applications={empty ? [] : data.applications} state={state} /></div>
      <div className="console-slot" data-section="topology" hidden={paged && active.section !== 'topology'}><RecoveryTopologyDistribution counts={counts} snapshots={empty ? undefined : data.snapshotSummary} state={state} /></div>
      <div className="console-slot" data-section="issues" hidden={paged && active.section !== 'issues'}><IssuesDistribution counts={counts} state={state} /></div>
      <div className="console-slot" data-section="infrastructure" hidden={paged && active.section !== 'infrastructure'}><InfrastructureOverview resources={empty ? [] : data.infrastructure} state={state} activeIndex={paged ? active.item : undefined} onDetail={resource => { show(resource.titleKey, state === 'partial' && resource.id === 'hitachi' ? 'partial' : resource.detailKey) }} /></div>
    </div>
    <Modal open={detail !== null} onClose={() => { setDetail(null) }} title={detail ? t(`dashboard.${detail.titleKey}`) : ''} footer={<Button variant="outline" onClick={() => { setDetail(null) }}>{t('dashboard.close')}</Button>} className="w-[calc(100%-2rem)]">
      {detail ? <div className="dashboard-detail p-6 text-sm"><p className="leading-6 text-text-secondary">{t(`dashboard.${detail.descriptionKey}`)}</p>{detail.object ? <p className="mt-3 break-words rounded-lg bg-surface-muted p-3 font-mono text-xs">{detail.object}</p> : null}<p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-text-muted">{t('dashboard.caption')}</p></div> : null}
    </Modal>
    <Modal open={previewOpen} onClose={() => { setPreviewOpen(false) }} title={t('dashboard.demo')} footer={<Button variant="outline" onClick={() => { setPreviewOpen(false) }}>{t('dashboard.close')}</Button>} className="w-[calc(100%-2rem)]">
      <div className="p-6"><p className="text-sm leading-6 text-text-secondary">{t('dashboard.caption')}</p>{import.meta.env.DEV ? <label className="mt-4 block text-sm font-medium">{t('dashboard.preview')}<select className="mt-2 block w-full rounded-lg border border-border bg-control p-2 text-text-primary" value={state} onChange={event => { const next = states.find(option => option.value === event.target.value); if (next) setState(next.value) }}>{states.map(option => <option key={option.value} value={option.value}>{t(`dashboard.${option.label}`)}</option>)}</select></label> : null}</div>
    </Modal>
  </div></div>
}
