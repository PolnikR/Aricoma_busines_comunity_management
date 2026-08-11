import type { ReactNode } from 'react'
import { SkeletonBlock } from '@/shared/components/data-table'
import { cn } from '@/shared/utils/cn'

interface StatCardProps {
  icon: ReactNode
  value: ReactNode
  label: ReactNode
  helper?: ReactNode
  size?: 'sm' | 'md'
  className?: string
}

export function StatCard({
  icon,
  value,
  label,
  helper,
  size = 'md',
  className,
}: StatCardProps) {
  const isSmall = size === 'sm'

  return (
    <article
      className={cn(
        'flex items-center border border-border bg-surface shadow-[0_12px_28px_-24px_rgba(37,72,112,0.5)]',
        isSmall ? 'gap-2.5 rounded-xl px-3 py-2' : 'min-h-20 gap-3 rounded-[18px] p-3.5',
        className,
      )}
    >
      <div className={cn(
        'flex shrink-0 items-center justify-center bg-accent-soft text-accent',
        isSmall ? 'size-8 rounded-lg' : 'size-11 rounded-xl',
      )}>
        {icon}
      </div>
      <div className="min-w-0">
        <strong className={cn(
          'block truncate font-semibold text-text-primary',
          isSmall ? 'text-sm leading-tight' : 'text-lg',
        )}>
          {value}
        </strong>
        <p className={cn(
          'font-medium text-text-secondary',
          isSmall ? 'truncate text-xs leading-tight' : 'text-sm',
        )}>
          {label}
        </p>
        {helper ? (
          <p className={cn(
            'truncate text-text-muted',
            isSmall ? 'text-[10px] leading-tight' : 'text-[11px]',
          )}>
            {helper}
          </p>
        ) : null}
      </div>
    </article>
  )
}

const metricSkeletons = [
  { valueWidth: 'w-16', labelWidth: 'w-24', helperWidth: 'w-28' },
  { valueWidth: 'w-12', labelWidth: 'w-20', helperWidth: 'w-24' },
  { valueWidth: 'w-10', labelWidth: 'w-16', helperWidth: 'w-24' },
  { valueWidth: 'w-24', labelWidth: 'w-28', helperWidth: 'w-24' },
]

export function MetricsSkeleton() {
  return (
    <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metricSkeletons.map((metric, index) => (
        <div
          key={index}
          className="flex min-h-20 items-center gap-3 rounded-[18px] border border-border bg-surface p-3.5"
        >
          <SkeletonBlock className="size-11 shrink-0 rounded-xl bg-accent-soft" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className={`h-5 ${metric.valueWidth}`} />
            <SkeletonBlock className={`h-3.5 ${metric.labelWidth}`} />
            <SkeletonBlock className={`h-2.5 ${metric.helperWidth}`} />
          </div>
        </div>
      ))}
    </div>
  )
}
