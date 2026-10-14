import { AlertTriangleIcon, AlertCircleIcon, ClockIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { formatDateTime } from '@/shared/utils/dateTime'
import type { DashboardIncident, DashboardState } from '../model/dashboardTypes'
import { DashboardPanel, DashboardStatePlaceholder } from './DashboardPanel'

export function RequiresAttention({ incidents, state, onDetail, onViewAll }: { incidents: DashboardIncident[]; state: DashboardState; onDetail: (incident: DashboardIncident) => void; onViewAll: () => void }) {
  const { t, language } = useTranslation()
  return <DashboardPanel title={t('dashboard.attention')} subtitle={t('dashboard.attentionSubtitle')} attention icon={<AlertTriangleIcon className="icon" />} action={<button type="button" className="view-link" onClick={onViewAll}>{t('dashboard.allIssues')}</button>}>
    {state === 'loading' || state === 'unknown' || incidents.length === 0 ? <DashboardStatePlaceholder state={state === 'demo' ? 'empty' : state} /> : <div className="incident-list">{incidents.slice(0, 3).map(incident => <button key={incident.id} type="button" className="incident" onClick={() => { onDetail(incident) }}>
      <span className={`incident-icon${incident.severity === 'warning' ? ' warning' : ''}`}>{incident.severity === 'warning' ? <AlertCircleIcon className="icon" /> : <AlertTriangleIcon className="icon" />}</span>
      <span className="incident-main"><span className="incident-name block">{t(`dashboard.${incident.titleKey}`)}</span><span className="incident-object block">{incident.object}</span><span className="incident-summary block">{t(`dashboard.${incident.summaryKey}`)}</span></span>
      <span className="incident-meta"><time className="incident-time" dateTime={incident.timestamp}><ClockIcon className="icon" />{formatDateTime(incident.timestamp, { language, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Bratislava' })}</time><span className="incident-action">{t('dashboard.details')}</span></span>
    </button>)}</div>}
  </DashboardPanel>
}
