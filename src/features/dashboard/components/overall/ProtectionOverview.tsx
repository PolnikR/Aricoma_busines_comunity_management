import { ShieldIcon } from '@/shared/icons/Icons'
import { overallNumber } from '../../model/overallPreviewMetrics'
import { OverallPanel } from './OverallPanel'

export function ProtectionOverview({ scope, stats }: {
  scope: string
  stats: { withSnapshots: number; withoutSnapshots: number; total: number; percent: number }
}) {
  const protectedShare = stats.total ? stats.withSnapshots / stats.total * 100 : 0
  const unprotectedShare = stats.total ? stats.withoutSnapshots / stats.total * 100 : 0
  return <OverallPanel title="Protection Overview" subtitle={`Volume coverage · ${scope}`} className="overall-protection">
    <div className="overall-protection-chart">
      <div className="overall-donut" role="img" aria-label={`${String(stats.percent)}% snapshot coverage; ${overallNumber(stats.withSnapshots)} with snapshots, ${overallNumber(stats.withoutSnapshots)} without snapshots`}>
        <svg viewBox="0 0 180 180" aria-hidden="true">
          <circle className="overall-donut-guide" cx="90" cy="90" r="83" />
          <circle className="overall-donut-track" cx="90" cy="90" r="70" />
          <circle className="overall-donut-arc overall-donut-arc-blue" cx="90" cy="90" r="70" pathLength="100" strokeDasharray={[protectedShare, 100 - protectedShare].join(' ')} />
          <circle className="overall-donut-arc overall-donut-arc-amber" cx="90" cy="90" r="70" pathLength="100" strokeDasharray={[unprotectedShare, 100 - unprotectedShare].join(' ')} strokeDashoffset={-protectedShare} />
        </svg>
        <div className="overall-donut-center"><ShieldIcon /><strong>{stats.percent}%</strong><span>snapshot coverage</span></div>
      </div>
      <div className="overall-protection-legend">
        <div className="overall-legend-row"><span><i className="overall-swatch blue" />With snapshots</span><strong>{overallNumber(stats.withSnapshots)}<small>{stats.total ? (stats.withSnapshots / stats.total * 100).toFixed(1) : '0.0'}%</small></strong></div>
        <div className="overall-legend-row"><span><i className="overall-swatch amber" />Without snapshots</span><strong>{overallNumber(stats.withoutSnapshots)}<small>{stats.total ? (stats.withoutSnapshots / stats.total * 100).toFixed(1) : '0.0'}%</small></strong></div>
      </div>
    </div>
  </OverallPanel>
}
