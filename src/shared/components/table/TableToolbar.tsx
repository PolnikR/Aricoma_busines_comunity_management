import type { ReactNode } from 'react'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { Button } from '@/shared/components/button/Button'
import { useTranslation } from '@/hooks/useTranslation'

interface TableToolbarProps {
  // Ignored: no longer rendered. Kept until every caller stops passing it.
  eyebrow?: string
  title: string
  description: string
  isFetching?: boolean
  onRefresh?: () => void
  actions?: ReactNode
  refreshLabel?: string
  updatingLabel?: string
}

export function TableToolbar({
  title,
  description,
  isFetching = false,
  onRefresh,
  actions,
  refreshLabel,
  updatingLabel,
}: TableToolbarProps) {
  const { t } = useTranslation()

  return (
    <PageHeader
      title={title}
      description={description}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          {isFetching ? (
            <span className="inline-flex items-center gap-2 text-xs text-text-muted">
              <span className="size-2 animate-pulse rounded-full bg-accent" />
              {updatingLabel ?? t('status.updating')}
            </span>
          ) : null}
          {actions}
          {onRefresh ? (
            <Button size="sm" variant="outline" onClick={onRefresh}>
              {refreshLabel ?? t('common.refresh')}
            </Button>
          ) : null}
        </div>
      }
    />
  )
}
