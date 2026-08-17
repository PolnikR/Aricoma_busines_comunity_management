import type { ReactNode } from 'react'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { Button } from '@/shared/components/button/Button'

interface TableToolbarProps {
  eyebrow: string
  title: string
  description: string
  isFetching?: boolean
  onRefresh?: () => void
  actions?: ReactNode
}

export function TableToolbar({
  eyebrow,
  title,
  description,
  isFetching = false,
  onRefresh,
  actions,
}: TableToolbarProps) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={
        <div className="flex items-center gap-3">
          {isFetching ? (
            <span className="inline-flex items-center gap-2 text-xs text-text-muted">
              <span className="size-2 animate-pulse rounded-full bg-accent" />
              Updating
            </span>
          ) : null}
          {actions}
          {onRefresh ? (
            <Button size="sm" variant="outline" onClick={onRefresh}>
              Refresh
            </Button>
          ) : null}
        </div>
      }
    />
  )
}
