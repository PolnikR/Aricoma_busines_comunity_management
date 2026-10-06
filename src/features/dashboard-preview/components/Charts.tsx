import { cn } from '@/shared/utils/cn'
import type { ActivityDay, StatusSlice } from '../model/mockDashboardData'
import { toneFillClass } from '../model/statusTone'

interface SegmentedBarProps {
  slices: StatusSlice[]
  className?: string
}

// Horizontal distribution bar; preferred over donuts/gauges.
export function SegmentedBar({ slices, className }: SegmentedBarProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const label = slices.map(slice => `${slice.label} ${String(slice.value)}`).join(', ')
  return (
    <div role="img" aria-label={label} className={cn('flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-surface-muted', className)}>
      {slices.filter(slice => slice.value > 0).map(slice => (
        <span
          key={slice.label}
          className={cn('h-full first:rounded-l-full last:rounded-r-full', toneFillClass[slice.tone])}
          style={{ width: `${String((slice.value / total) * 100)}%` }}
        />
      ))}
    </div>
  )
}

export function SliceLegend({ slices }: { slices: StatusSlice[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
      {slices.map(slice => (
        <li key={slice.label} className="inline-flex items-center gap-1.5">
          <span className={cn('size-2 rounded-full', toneFillClass[slice.tone])} />
          {slice.label}
          <strong className="font-semibold text-text-primary tabular-nums">{slice.value}</strong>
        </li>
      ))}
    </ul>
  )
}

const activitySeries = [
  { key: 'successful', label: 'Successful', fill: 'bg-success-500' },
  { key: 'failed', label: 'Failed', fill: 'bg-error-500' },
  { key: 'running', label: 'Running', fill: 'bg-accent' },
] as const

interface ActivityChartProps {
  days: ActivityDay[]
  heightClassName?: string
}

// Stacked daily bars, plain CSS. Gridlines mark 0 / half / max.
export function ActivityChart({ days, heightClassName = 'h-36' }: ActivityChartProps) {
  const max = Math.max(...days.map(day => day.successful + day.failed + day.running))
  const summary = days.map(day => `${day.day}: ${String(day.successful)} successful, ${String(day.failed)} failed, ${String(day.running)} running`).join('; ')

  return (
    <figure className="flex flex-1 flex-col gap-2">
      <div className={cn('flex gap-2', heightClassName)}>
        <div className="flex flex-col justify-between text-right text-[10px] text-text-subtle tabular-nums" aria-hidden="true">
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>
        <div role="img" aria-label={summary} className="relative flex flex-1 items-end gap-2 sm:gap-3">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
            <span className="border-t border-dashed border-border" />
            <span className="border-t border-dashed border-border" />
            <span className="border-t border-border-strong" />
          </div>
          {days.map(day => {
            const total = day.successful + day.failed + day.running
            return (
              <div key={day.day} className="relative flex h-full flex-1 flex-col justify-end" title={`${day.day}: ${String(day.successful)} ok · ${String(day.failed)} failed · ${String(day.running)} running`}>
                <div className="mx-auto flex w-full max-w-9 flex-col-reverse gap-px overflow-hidden rounded-t-md" style={{ height: `${String((total / max) * 100)}%` }}>
                  {activitySeries.map(series => (
                    day[series.key] > 0 ? (
                      <span key={series.key} className={series.fill} style={{ flexGrow: day[series.key] }} />
                    ) : null
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex gap-2 pl-6 sm:gap-3" aria-hidden="true">
        {days.map(day => (
          <span key={day.day} className={cn('flex-1 text-center text-[11px] text-text-muted', day.day === 'Today' && 'font-semibold text-text-secondary')}>{day.day}</span>
        ))}
      </div>
    </figure>
  )
}

export function ActivityLegend({ totals }: { totals: { successful: number, failed: number, running: number } }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
      {activitySeries.map(series => (
        <li key={series.key} className="inline-flex items-center gap-1.5">
          <span className={cn('size-2 rounded-full', series.fill)} />
          {series.label}
          <strong className="font-semibold text-text-primary tabular-nums">{totals[series.key]}</strong>
        </li>
      ))}
    </ul>
  )
}

interface SparklineProps {
  points: number[]
  className?: string
}

export function Sparkline({ points, className }: SparklineProps) {
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const step = 100 / (points.length - 1)
  const path = points.map((point, index) => `${String(index * step)},${String(26 - ((point - min) / range) * 22)}`).join(' ')
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className={cn('h-7 w-full', className)} aria-hidden="true">
      <polyline points={path} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
