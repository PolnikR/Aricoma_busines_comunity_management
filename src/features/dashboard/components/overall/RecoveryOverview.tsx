import { GridIcon, LayersIcon } from '@/shared/icons/Icons'
import type { ReactNode } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import type { OverallPreviewData } from '../../model/overallPreviewMetrics'
import { OverallPanel } from './OverallPanel'

interface RecoveryPart { label: string; value: number; tone: 'blue' | 'teal' }

function RecoveryTile({ title, icon, parts }: {
  title: string
  icon: ReactNode
  parts: RecoveryPart[]
}) {
  const total = parts.reduce((sum, part) => sum + part.value, 0)
  const percentages = parts.map(part => ({
    ...part,
    percent: total > 0 ? Math.round(part.value / total * 100) : 0,
  }))
  return <article className="overall-recovery-tile" aria-label={title}>
    <div className="overall-recovery-title"><span className="overall-recovery-icon">{icon}</span><h3>{title}</h3></div>
    <div className="overall-recovery-percentages">
      {percentages.map(part => <div className="overall-recovery-share" key={part.label}>
        <span className="overall-recovery-category"><i className={`overall-swatch ${part.tone}`} />{part.label}<span className="overall-recovery-count">{part.value}</span></span>
        <strong>{part.percent}%</strong>
      </div>)}
    </div>
    <div className="overall-progress" role="img" aria-label={percentages.map(part => `${part.label}: ${String(part.value)} (${String(part.percent)}%)`).join(', ')}>
      {parts.map(part => <span key={part.label} style={{ flex: part.value, background: `var(--overall-${part.tone})` }} />)}
    </div>
  </article>
}

export function RecoveryOverview({ data }: { data: OverallPreviewData }) {
  const { t } = useTranslation()
  return <OverallPanel title={t('overview.recovery.title')} subtitle={t('overview.recovery.subtitle')} className="overall-recovery">
    <div className="overall-recovery-grid">
      <RecoveryTile title={t('overview.recoveryGroups')} icon={<LayersIcon />} parts={[{ label: t('overview.local'), value: data.groups.local, tone: 'blue' }, { label: t('overview.remote'), value: data.groups.remote, tone: 'teal' }]} />
      <RecoveryTile title={t('overview.recoveryApplications')} icon={<GridIcon />} parts={[{ label: 'VMware', value: data.applications.vmware, tone: 'blue' }, { label: 'IBM Power', value: data.applications.power, tone: 'teal' }]} />
    </div>
  </OverallPanel>
}
