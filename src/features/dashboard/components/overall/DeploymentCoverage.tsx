import type { OverallPreviewData } from '../../model/overallPreviewMetrics'
import { OverallPanel } from './OverallPanel'

function CoverageTrack({ title, pushed, total, tone }: { title: string; pushed: number; total: number; tone: 'blue' | 'teal' }) {
  return <div className="overall-deployment-metric">
    <div className="overall-deployment-label"><span>{title}</span><strong>{pushed} <small>/ {total} apps</small></strong></div>
    <div className="overall-deployment-track" role="progressbar" aria-label={`${title} pushed to orchestrator (demo)`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={pushed}>
      <span style={{ width: String(total ? pushed / total * 100 : 0) + '%', background: `var(--overall-${tone})` }} />
    </div>
  </div>
}
export function DeploymentCoverage({ data }: { data: OverallPreviewData }) {
  return <OverallPanel title="Deployment Coverage" subtitle="Applications marked as pushed to the orchestrator" className="overall-deployment">
    <div className="overall-deployment-grid">
      <CoverageTrack title="VMware" {...data.deployment.vmware} tone="blue" />
      <CoverageTrack title="IBM Power" {...data.deployment.power} tone="teal" />
      <div className="overall-deployment-summary"><span>Production<strong>{data.deployment.production.pushed} / {data.deployment.production.total}</strong></span><span>Test<strong>{data.deployment.test.pushed} / {data.deployment.test.total}</strong></span></div>
    </div>
  </OverallPanel>
}
