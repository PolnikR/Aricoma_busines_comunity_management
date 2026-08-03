import { useTranslation } from '@/hooks/useTranslation'
import { DataTableSkeleton } from '@/shared/components/data-table'

export function RouteLoadingSkeleton() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <div className="mb-5 flex shrink-0 items-end justify-between gap-4" aria-hidden="true">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
          <div className="h-8 w-72 max-w-[70vw] animate-pulse rounded-md bg-surface-muted" />
          <div className="h-4 w-96 max-w-[80vw] animate-pulse rounded bg-surface-muted" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-lg bg-surface-muted" />
      </div>

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
