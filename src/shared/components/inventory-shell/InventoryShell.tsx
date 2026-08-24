import type { ReactNode } from 'react'
import { Card } from '@/shared/components/card/Card'
import { DataTableSkeleton } from '@/shared/components/data-table'
import { MetricsSkeleton } from '@/shared/components/stat-card/StatCard'

interface InventoryShellProps {
  metrics?: ReactNode
  inventoryTitle?: string
  inventoryDescription?: string
  tabs?: ReactNode
  notice?: ReactNode
  children: ReactNode
}

export function InventoryShell({
  metrics,
  inventoryTitle,
  inventoryDescription,
  tabs,
  notice,
  children,
}: InventoryShellProps) {
  return (
  <div className="flex flex-1 flex-col gap-4 lg:min-h-0">
    {metrics}
    {notice}

    <section
      className="flex flex-1 flex-col lg:min-h-0"
      aria-label={inventoryTitle}
    >
      <Card className="relative flex flex-1 flex-col overflow-hidden p-0 sm:p-0 lg:min-h-0">
        {(Boolean(inventoryTitle) || Boolean(inventoryDescription) || Boolean(tabs)) && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-b border-border px-4 py-2.5">
            {(Boolean(inventoryTitle) || Boolean(inventoryDescription)) && (
              <div className="mr-auto">
                {inventoryTitle && (
                  <h2 className="text-sm font-semibold text-text-primary">
                    {inventoryTitle}
                  </h2>
                )}

                {inventoryDescription && (
                  <p className="text-xs text-text-muted">
                    {inventoryDescription}
                  </p>
                )}
              </div>
            )}

            {tabs}
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden bg-surface-subtle p-3 lg:min-h-0">
          {children}
        </div>
      </Card>
    </section>
  </div>
);
}

export function VirtualMachinesSkeleton() {
  return (
    <div
      className="flex flex-1 flex-col gap-4 lg:min-h-0"
      aria-busy="true"
    >
      <MetricsSkeleton />

      <Card className="relative flex flex-1 flex-col overflow-hidden p-0 sm:p-0 lg:min-h-0">
        <div className="shrink-0 border-b border-border bg-surface px-4 py-3" aria-hidden="true">
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
        <div className="flex flex-1 flex-col bg-surface-subtle p-3 lg:min-h-0">
          <DataTableSkeleton
            columnCount={9}
            ariaLabel="Loading virtual machines"
            className="flex-1 lg:min-h-0"
          />
        </div>
      </Card>
    </div>
  )
}
