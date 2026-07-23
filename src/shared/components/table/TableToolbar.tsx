import { PageHeader } from '@/shared/components/page/PageHeader'
import { Button } from '@/shared/components/button/Button'
import { RowDensityToggle } from './RowDensityToggle'
import type { TableDensity } from './RowDensityToggle'

interface TableToolbarProps {
  eyebrow: string
  title: string
  description: string
  density: TableDensity
  onDensityChange: (density: TableDensity) => void
  isFetching?: boolean
  onRefresh?: () => void
}

export function TableToolbar({
  eyebrow,
  title,
  description,
  density,
  onDensityChange,
  isFetching,
  onRefresh,
}: TableToolbarProps) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={
        <div className="flex items-center gap-3">
          {onRefresh ? (
            <Button size="sm" variant="outline" onClick={onRefresh}>
              Refresh
            </Button>
          ) : null}
          <RowDensityToggle density={density} onDensityChange={onDensityChange} isFetching={isFetching} />
        </div>
      }
    />
  )
}
