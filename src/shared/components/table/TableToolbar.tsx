import type { ReactNode } from 'react'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { Button } from '@/shared/components/button/Button'
import { RowDensityToggle } from './RowDensityToggle'
import type { TableDensity } from './RowDensityToggle'

interface TableToolbarProps {
  eyebrow: string
  title: string
  description: string
  isFetching?: boolean
  onRefresh?: () => void
  actions?: ReactNode
  density?: TableDensity
  onDensityChange?: (density: TableDensity) => void
}

export function TableToolbar({
  eyebrow,
  title,
  description,
  isFetching = false,
  onRefresh,
  actions,
  density,
  onDensityChange,
}: TableToolbarProps) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={
        <div className="flex items-center gap-3">
          {isFetching ? (
            <span className="inline-flex items-center gap-2 text-xs text-[#71819a]">
              <span className="size-2 animate-pulse rounded-full bg-[#0d91d7]" />
              Updating
            </span>
          ) : null}
          {actions}
          {onRefresh ? (
            <Button size="sm" variant="outline" onClick={onRefresh}>
              Refresh
            </Button>
          ) : null}
          {density && onDensityChange ? (
            <RowDensityToggle
              density={density}
              onDensityChange={onDensityChange}
              isFetching={isFetching}
            />
          ) : null}
        </div>
      }
    />
  )
}
