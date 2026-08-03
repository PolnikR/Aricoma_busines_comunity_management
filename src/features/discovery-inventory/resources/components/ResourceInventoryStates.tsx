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
      className="flex-1 lg:min-h-0"
    />
  )
}

export function ResourceInventoryState({ children }: { children: ReactNode }) {
  return (
    <section className="flex min-h-72 flex-1 items-center justify-center rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="w-full max-w-3xl">{children}</div>
    </section>
  )
}
