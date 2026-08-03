import { cn } from '@/shared/utils/cn'

interface ListSkeletonProps {
  rowCount?: number
  ariaLabel?: string
  className?: string
}

export function ListSkeleton({
  rowCount = 6,
  ariaLabel = 'Loading list',
  className,
}: ListSkeletonProps) {
  const rows = Array.from({ length: Math.max(1, rowCount) })

  return (
    <div
      className={cn('space-y-1 p-2', className)}
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      <div className="space-y-1" aria-hidden="true">
        {rows.map((_, index) => (
          <div
            key={index}
            className="h-8 animate-pulse rounded-md border border-border bg-surface-muted"
          />
        ))}
      </div>
    </div>
  )
}
