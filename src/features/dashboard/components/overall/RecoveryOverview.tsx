import { GridIcon, LayersIcon } from '@/shared/icons/Icons'
import type { ReactNode } from 'react'
import type { OverallPreviewData } from '../../model/overallPreviewMetrics'
import { overallNumber } from '../../model/overallPreviewMetrics'
import { OverallPanel } from './OverallPanel'

function RecoveryTile({ title, unit, count, icon, parts }: {
  title: string; unit: string; count: number; icon: ReactNode
  parts: { label: string; value: number; tone: 'blue' | 'teal' }[]
}) {
  return <article className="overall-recovery-tile" aria-label={title}>
    <div className="overall-recovery-title"><span className="overall-recovery-icon">{icon}</span><h3>{title}</h3></div>
    <div className="overall-recovery-total"><strong>{overallNumber(count)}</strong><span>{unit}</span></div>
    <div className="overall-progress" role="img" aria-label={parts.map(part => `${String(part.value)} ${part.label}`).join(', ')}>
      {parts.map(part => <span key={part.label} style={{ flex: part.value, background: `var(--overall-${part.tone})` }} />)}
    </div>
    <div className="overall-recovery-legend">{parts.map(part => <span key={part.label}><i className={`overall-swatch ${part.tone}`} />{part.value} {part.label}</span>)}</div>
  </article>
}

export function RecoveryOverview({ data }: { data: OverallPreviewData }) {
  return <OverallPanel title="Recovery Overview" subtitle="Configured recovery inventory · local / remote and compute platform" className="overall-recovery">
    <div className="overall-recovery-grid">
      <RecoveryTile title="Recovery Groups" unit="groups" icon={<LayersIcon />} count={data.groups.local + data.groups.remote} parts={[{ label: 'Local', value: data.groups.local, tone: 'blue' }, { label: 'Remote', value: data.groups.remote, tone: 'teal' }]} />
      <RecoveryTile title="Recovery Applications" unit="apps" icon={<GridIcon />} count={data.applications.vmware + data.applications.power} parts={[{ label: 'VMware', value: data.applications.vmware, tone: 'blue' }, { label: 'IBM Power', value: data.applications.power, tone: 'teal' }]} />
    </div>
  </OverallPanel>
}
