import type { ReactNode } from 'react'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { Button } from '@/shared/components/button/Button'
import { useTranslation } from '@/hooks/useTranslation'
import { RefreshIcon } from '@/shared/icons/Icons'

interface TableToolbarProps {
  title: string
  description: string
  isFetching?: boolean
  onRefresh?: () => void
  actions?: ReactNode
  refreshLabel?: string
  updatingLabel?: string
  /** Number of records, shown next to the title. */
  count?: number
}

export function TableToolbar({
  title,
  description,
  isFetching = false,
  onRefresh,
  actions,
  refreshLabel,
  updatingLabel,
  count,
}: TableToolbarProps) {
  const { t } = useTranslation()
  const refreshText = refreshLabel ?? t('common.refresh')
  const updatingText = updatingLabel ?? t('status.updating')

  return (
    <PageHeader
      title={count === undefined ? title : (
        <>
          {title}
          <span className="ml-2.5 inline-block rounded-full bg-accent-soft px-2 align-middle text-[13px] font-semibold leading-6 tabular-nums text-accent">{count}</span>
        </>
      )}
      description={description}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          {onRefresh ? (
            // The spinning icon shows progress; this live text tells assistive tech. No status role,
            // so it does not compete with the table's own loading status.
            <span className="sr-only" aria-live="polite">{isFetching ? updatingText : ''}</span>
          ) : isFetching ? (
            <span className="inline-flex items-center gap-2 text-xs text-text-muted">
              <span className="size-2 animate-pulse rounded-full bg-accent" />
              {updatingText}
            </span>
          ) : null}
          {actions}
          {onRefresh ? (
            <Button
              size="sm"
              variant="outline"
              className="w-9 px-0!"
              onClick={onRefresh}
              aria-label={refreshText}
              title={refreshText}
              aria-busy={isFetching ? true : undefined}
            >
              <RefreshIcon className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          ) : null}
        </div>
      }
    />
  )
}
