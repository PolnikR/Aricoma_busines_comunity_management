import type { ReactNode } from 'react'
import {
  DataTableRequestState,
  type DataTableRequestError,
} from '@/shared/components/data-table'

interface InventoryPanelProps {
  ariaLabel: string
  toolbar: ReactNode
  children: ReactNode
  pagination?: ReactNode
  error?: DataTableRequestError | null
  hasCachedData?: boolean
}

export function InventoryPanel({
  ariaLabel,
  toolbar,
  children,
  pagination,
  error,
  hasCachedData = false,
}: InventoryPanelProps) {
  return (
    <section
      className="grid min-w-0 min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
      aria-label={ariaLabel}
    >
      {toolbar}
      <div className="custom-scrollbar min-h-0 overflow-y-auto">
        <DataTableRequestState error={error ?? null} hasCachedData={hasCachedData}>
          {children}
        </DataTableRequestState>
      </div>
      {(!error || hasCachedData) && pagination}
    </section>
  )
}
