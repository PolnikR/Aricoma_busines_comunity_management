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
      className="flex-1 min-h-0 !rounded-[20px]"
    />
  )
}

export function ResourceInventoryState({ children }: { children: ReactNode }) {
  return (
    <section className="grid min-w-0 min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[20px] border border-border bg-surface shadow-sm">
      <div className="row-start-2 flex min-h-0 items-center justify-center p-4">
        <div className="w-full max-w-3xl">{children}</div>
      </div>
    </section>
  )
}
