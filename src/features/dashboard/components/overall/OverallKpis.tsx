import { GridIcon, LayersIcon, ServerIcon, ShieldIcon } from '@/shared/icons/Icons'
import type { ReactNode } from 'react'
import type { OverallPreviewData } from '../../model/overallPreviewMetrics'
import { overallNumber } from '../../model/overallPreviewMetrics'

function Bar({ values, tones }: { values: number[]; tones: string[] }) {
  return <div className="overall-kpi-track" aria-hidden="true">
    {values.map((value, i) => <span key={i} style={{ flex: value, background: tones[i] }} />)}
  </div>
}
function Card({ title, value, unit, icon, children, progress }: {
  title: string; value: number; unit: string; icon: ReactNode; children: ReactNode; progress?: ReactNode
}) {
  return <article className="overall-kpi">
    <div className="overall-kpi-title"><span>{title}</span><span className="overall-kpi-icon">{icon}</span></div>
    <div className="overall-kpi-value"><strong>{overallNumber(value)}</strong><span>{unit}</span></div>
    {progress}
    <div className="overall-kpi-foot">{children}</div>
  </article>
}
export function OverallKpis({ data, protection }: { data: OverallPreviewData; protection: { withSnapshots: number; total: number; withoutSnapshots: number } }) {
  const totalProviders = data.providers.reduce((sum, item) => sum + item.total, 0)
  const groups = data.groups.local + data.groups.remote
  const apps = data.applications.vmware + data.applications.power
  return <section className="overall-kpis" aria-label="Key statistics">
    <Card title="Registered providers" value={totalProviders} unit="providers" icon={<ServerIcon />}><span className="overall-kpi-chip">4 technologies</span> VMware · Power · IBM · Hitachi</Card>
    <Card title="Volumes with snapshots" value={protection.withSnapshots} unit={`/ ${overallNumber(protection.total)}`} icon={<ShieldIcon />} progress={<Bar values={[protection.withSnapshots, protection.withoutSnapshots]} tones={['var(--overall-blue)', 'var(--overall-amber)']} />}>{overallNumber(protection.withoutSnapshots)} without snapshot · selected vendor</Card>
    <Card title="Recovery Groups" value={groups} unit="groups" icon={<LayersIcon />} progress={<Bar values={[data.groups.local, data.groups.remote]} tones={['var(--overall-blue)', 'var(--overall-teal)']} />}>{data.groups.local} Local · {data.groups.remote} Remote</Card>
    <Card title="Recovery Applications" value={apps} unit="apps" icon={<GridIcon />} progress={<Bar values={[data.applications.vmware, data.applications.power]} tones={['var(--overall-blue)', 'var(--overall-teal)']} />}>{data.applications.vmware} VMware · {data.applications.power} IBM Power</Card>
  </section>
}
