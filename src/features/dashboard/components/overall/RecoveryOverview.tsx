import { GridIcon, LayersIcon } from '@/shared/icons/Icons'
import type { ReactNode } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import type { OverallPreviewData } from '../../model/overallPreviewMetrics'
import { overallNumber } from '../../model/overallPreviewMetrics'
import { OverallPanel } from './OverallPanel'

interface RecoveryPart { label: string; value: number; tone: 'blue' | 'teal' }

function RecoveryTile({ title, unit, count, icon, parts }: {
  title: string; unit: string; count: number; icon: ReactNode
  parts: RecoveryPart[]
}) {
  const { language } = useTranslation()
  return <article className="overall-recovery-tile" aria-label={title}>
    <div className="overall-recovery-title"><span className="overall-recovery-icon">{icon}</span><h3>{title}</h3></div>
    <div className="overall-recovery-total"><strong>{overallNumber(count, language)}</strong><span>{unit}</span></div>
    <div className="overall-progress" role="img" aria-label={parts.map(part => `${String(part.value)} ${part.label}`).join(', ')}>
      {parts.map(part => <span key={part.label} style={{ flex: part.value, background: `var(--overall-${part.tone})` }} />)}
    </div>
    <div className="overall-recovery-legend">{parts.map(part => <span key={part.label}><i className={`overall-swatch ${part.tone}`} />{part.value} {part.label}</span>)}</div>
  </article>
}

export function RecoveryOverview({ data }: { data: OverallPreviewData }) {
  const { t } = useTranslation()
  return <OverallPanel title={t('overview.recovery.title')} subtitle={t('overview.recovery.subtitle')} className="overall-recovery">
    <div className="overall-recovery-grid">
      <RecoveryTile title={t('overview.recoveryGroups')} unit={t('overview.groups')} icon={<LayersIcon />} count={data.groups.local + data.groups.remote} parts={[{ label: t('overview.local'), value: data.groups.local, tone: 'blue' }, { label: t('overview.remote'), value: data.groups.remote, tone: 'teal' }]} />
      <RecoveryTile title={t('overview.recoveryApplications')} unit={t('overview.apps')} icon={<GridIcon />} count={data.applications.vmware + data.applications.power} parts={[{ label: 'VMware', value: data.applications.vmware, tone: 'blue' }, { label: 'IBM Power', value: data.applications.power, tone: 'teal' }]} />
    </div>
  </OverallPanel>
}
