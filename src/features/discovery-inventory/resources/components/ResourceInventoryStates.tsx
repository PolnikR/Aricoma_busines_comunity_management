import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@/shared/components/data-table'

interface ResourceInventoryLoadingProps {
  ariaLabel: string
  columnCount?: number
}

export function ResourceInventoryLoading({ ariaLabel, columnCount = 9 }: ResourceInventoryLoadingProps) {
  return (
    <DataTableSkeleton
      columnCount={columnCount}
      ariaLabel={ariaLabel}
      layout="fit"
      frame="embedded"
      className="flex-1 min-h-0"
    />
  )
}

export function ResourceInventoryState({ children }: { children: ReactNode }) {
  return (
    <section className="flex min-w-0 min-h-0 flex-1 items-center justify-center p-4">
      <div className="w-full max-w-3xl">{children}</div>
    </section>
  )
}
