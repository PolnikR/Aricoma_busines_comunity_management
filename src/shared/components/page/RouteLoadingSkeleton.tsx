import { useTranslation } from '@/hooks/useTranslation'
import { DataTableSkeleton } from '@/shared/components/data-table'

type RouteLoadingSkeletonVariant = 'table' | 'workspace' | 'builder'

interface RouteLoadingSkeletonProps {
  variant?: RouteLoadingSkeletonVariant
}

// Mirrors PageHeader: a 36px title line, a 20px description line and mb-4.
function PageHeadingSkeleton({ actionWidth }: { actionWidth: string }) {
  return (
    <div data-testid="route-skeleton-heading" className="mb-4 flex shrink-0 items-start justify-between gap-4" aria-hidden="true">
      <div>
        <div className="flex h-9 items-center"><div className="h-6 w-72 max-w-[70vw] animate-pulse rounded-md bg-surface-muted" /></div>
        <div className="flex h-5 items-center"><div className="h-3.5 w-96 max-w-[80vw] animate-pulse rounded bg-surface-muted" /></div>
      </div>
      <div className={`h-9 ${actionWidth} animate-pulse rounded-lg bg-surface-muted`} />
    </div>
  )
}

export function RouteLoadingSkeleton({ variant = 'table' }: RouteLoadingSkeletonProps) {
  const { t } = useTranslation()

  if (variant === 'builder') {
    return (
      <div className="flex min-h-full flex-col overflow-hidden lg:h-full lg:min-h-0" aria-busy="true" aria-label={t('messages.loading')}>
        <PageHeadingSkeleton actionWidth="w-20" />
        <div className="flex min-h-0 flex-1 p-4"><div className="grid min-h-0 flex-1 overflow-hidden rounded-[20px] border border-border bg-surface shadow-sm lg:grid-cols-[280px_minmax(0,1fr)]"><div className="animate-pulse border-r border-border bg-surface-subtle" /><div className="animate-pulse bg-surface-muted" /></div></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeadingSkeleton actionWidth="w-28" />

      <div className="flex flex-1 flex-col overflow-hidden p-3 lg:min-h-0">
        <DataTableSkeleton
          columnCount={5}
          ariaLabel={t('messages.loading')}
          className="flex-1 lg:min-h-0"
        />
      </div>
    </div>
  )
}
