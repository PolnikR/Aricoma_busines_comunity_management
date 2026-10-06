import { Badge } from '@/shared/components/badge/Badge'
import { cn } from '@/shared/utils/cn'
import type { DashboardData } from '../model/mockDashboardData'
import { Sparkline } from './Charts'
import { DashboardPanel } from './DashboardPanel'
import { KpiTile } from './KpiTile'

interface StorageSummaryProps {
  storage: DashboardData['storage']
  className?: string
}

export function StorageSummary({ storage, className }: StorageSummaryProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2.5', className)}>
      {storage.map(item => (
        <KpiTile key={item.id} size="sm" label={item.label} value={item.value} detail={item.detail} drillTo={item.drillTo} />
      ))}
    </div>
  )
}

interface PerformancePlaceholderProps {
  metrics: DashboardData['performance']
  className?: string
}

// Future metrics, deliberately greyed: dashed card, neutral sparklines and an explicit mock badge.
export function PerformancePlaceholder({ metrics, className }: PerformancePlaceholderProps) {
  return (
    <DashboardPanel
      title="Performance"
      description="Not available yet — layout placeholder for future telemetry"
      tone="placeholder"
      className={className}
      action={<Badge color="light" size="sm">Mock placeholder</Badge>}
    >
      <div className="grid grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-3">
        {metrics.map(metric => (
          <div key={metric.id} className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-text-subtle">{metric.label}</p>
            <p className="mt-0.5 text-lg font-semibold leading-tight text-text-muted tabular-nums">
              {metric.value}
              <span className="ml-0.5 text-xs font-medium">{metric.unit}</span>
            </p>
            <Sparkline points={metric.points} className="mt-1 text-text-subtle" />
          </div>
        ))}
      </div>
    </DashboardPanel>
  )
}
