import { ServerIcon, LayersIcon, StorageIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import type { DashboardResource, DashboardState } from '../model/dashboardTypes'
import { DashboardPanel, DashboardStatePlaceholder } from './DashboardPanel'

export function InfrastructureOverview({ resources, state, onDetail, activeIndex }: { resources: DashboardResource[]; state: DashboardState; onDetail: (resource: DashboardResource) => void; activeIndex?: number | undefined }) {
  const { t, language } = useTranslation()
  const number = new Intl.NumberFormat(language)
  return <DashboardPanel title={t('dashboard.infrastructure')} subtitle={t('dashboard.infrastructureSubtitle')} icon={<ServerIcon className="icon" />}>
    {state === 'loading' || state === 'unknown' || resources.length === 0 ? <DashboardStatePlaceholder state={state === 'demo' ? 'empty' : state} /> : <div className="resources">{resources.filter((_, index) => activeIndex === undefined || index === activeIndex).map(resource => {
      const missing = state === 'partial' && resource.id === 'hitachi'
      return <button key={resource.id} type="button" className="resource" onClick={() => { onDetail(resource) }}>
        <span className="resource-top"><span className="resource-icon">{resource.id === 'vmware' ? <ServerIcon className="icon" /> : resource.id === 'power' ? <LayersIcon className="icon" /> : <StorageIcon className="icon" />}</span><span><span className="resource-title">{t(`dashboard.${resource.titleKey}`)}</span><span className="resource-sub">{resource.technology}</span></span></span>
        <span className="resource-bottom"><strong className="resource-count">{missing ? '—' : number.format(resource.total)}</strong><span className="resource-unit">{t(`dashboard.${resource.unitKey}`)}</span><span className="resource-spacer" /><span className="resource-meter"><span className="resource-meter-info"><span>{t(missing ? 'dashboard.unknown' : `dashboard.${resource.metricKey}`)}</span>{missing ? null : <b>{number.format(resource.selected)} / {number.format(resource.total)}</b>}</span>{missing ? <span className="resource-error">{t('dashboard.partial')}</span> : <span className="track" role="progressbar" aria-label={`${t(`dashboard.${resource.titleKey}`)} · ${t(`dashboard.${resource.metricKey}`)}`} aria-valuemin={0} aria-valuemax={resource.total || 1} aria-valuenow={resource.selected} aria-valuetext={`${number.format(resource.selected)} / ${number.format(resource.total)}`}><span className="track-fill block" style={{ width: `${String(resource.total ? resource.selected / resource.total * 100 : 0)}%` }} /></span>}</span></span>
      </button>
    })}</div>}
  </DashboardPanel>
}
