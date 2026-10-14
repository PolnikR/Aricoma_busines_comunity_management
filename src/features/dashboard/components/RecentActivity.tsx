import { ClockIcon, CheckIcon, ExecutionIcon, InfoIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { formatDateTime } from '@/shared/utils/dateTime'
import type { DashboardEvent, DashboardState } from '../model/dashboardTypes'
import { DashboardPanel, DashboardStatePlaceholder } from './DashboardPanel'

export function RecentActivity({ events, state, onDetail, onViewAll }: { events: DashboardEvent[]; state: DashboardState; onDetail: (event: DashboardEvent) => void; onViewAll: () => void }) {
  const { t, language } = useTranslation()
  return <DashboardPanel title={t('dashboard.activity')} subtitle={t('dashboard.activitySubtitle')} icon={<ClockIcon className="icon" />} action={<button type="button" className="view-link" onClick={onViewAll}>{t('dashboard.allActivity')}</button>}>
    {state === 'loading' || state === 'unknown' || events.length === 0 ? <DashboardStatePlaceholder state={state === 'demo' ? 'empty' : state} /> : <div className="timeline">{[...events].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 3).map(event => <button key={event.id} type="button" className="event" onClick={() => { onDetail(event) }}>
      <span className={`event-mark ${event.tone}`}>{event.tone === 'success' ? <CheckIcon className="icon" /> : event.tone === 'info' ? <ExecutionIcon className="icon" /> : <InfoIcon className="icon" />}</span>
      <span className="event-body"><span className="event-title block">{t(`dashboard.${event.titleKey}`)}</span><span className="event-object block">{event.object}</span><span className="event-detail block">{t(`dashboard.${event.summaryKey}`)}</span></span>
      <time className="event-time" dateTime={event.timestamp}><ClockIcon className="icon" />{formatDateTime(event.timestamp, { language, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Bratislava' })}</time>
    </button>)}</div>}
  </DashboardPanel>
}
