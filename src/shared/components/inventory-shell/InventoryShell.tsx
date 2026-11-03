import type { ReactNode } from 'react'
import { InventoryViewFrame } from './InventoryViewFrame'
import { DataTableSkeleton } from '@/shared/components/data-table'
import { MetricsSkeleton } from '@/shared/components/stat-card/StatCard'
import { cn } from '@/shared/utils/cn'

interface InventoryShellProps {
  metrics?: ReactNode
  inventoryTitle?: string
  inventoryDescription?: ReactNode
  tabs?: ReactNode
  notice?: ReactNode
  /** Reduce desktop spacing around the table without changing row density. */
  compactSpacing?: boolean
  /**
   * lg+ lower bound for the inventory card, e.g. `lg:min-h-[480px]`. It replaces the default
   * `lg:min-h-0`, so on short viewports the card stops shrinking and the route frame scrolls instead.
   */
  surfaceMinHeightClassName?: string
  children: ReactNode
}

export function InventoryShell({
  metrics,
  inventoryTitle,
  tabs,
  notice,
  compactSpacing = false,
  surfaceMinHeightClassName,
  children,
}: InventoryShellProps) {
  return (
    <div className={cn('flex min-w-0 flex-1 flex-col gap-4', !surfaceMinHeightClassName && 'lg:min-h-0', compactSpacing && 'lg:gap-1')}>
      {metrics}
      {notice}
      <InventoryViewFrame
        ariaLabel={inventoryTitle}
        tabs={tabs}
        {...(surfaceMinHeightClassName ? { minHeightClassName: surfaceMinHeightClassName } : {})}
      >
        {children}
      </InventoryViewFrame>
    </div>
  )
}

export function VirtualMachinesSkeleton() {
  return (
    <div
      className="flex flex-1 flex-col gap-4 lg:min-h-0"
      aria-busy="true"
    >
      <MetricsSkeleton />

      <InventoryViewFrame ariaLabel="Loading virtual machines">
        <div className="shrink-0 border-b border-border px-4 py-3" aria-hidden="true">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-5 w-48 rounded-lg bg-linear-to-r from-border to-surface-muted animate-pulse" />
              <div className="h-3 w-64 rounded-lg bg-linear-to-r from-border to-surface-muted animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-20 rounded-md bg-surface-muted animate-pulse" />
              <div className="h-9 w-16 rounded-md bg-surface-muted animate-pulse" />
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col lg:min-h-0">
          <DataTableSkeleton
            columnCount={9}
            ariaLabel="Loading virtual machines"
            className="flex-1 lg:min-h-0"
          />
        </div>
      </InventoryViewFrame>
    </div>
  )
}
