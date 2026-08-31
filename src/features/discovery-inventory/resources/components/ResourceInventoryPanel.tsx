import type { ReactNode } from 'react'
import {
  DataTableRequestState,
  type DataTableRequestError,
} from '@/shared/components/data-table'

export type ResourceInventoryPanelError = DataTableRequestError

interface ResourceInventoryPanelProps {
  ariaLabel: string
  toolbar: ReactNode
  children: ReactNode
  pagination?: ReactNode
  error?: ResourceInventoryPanelError | null
}

export function ResourceInventoryPanel({
  ariaLabel,
  toolbar,
  children,
  pagination,
  error,
}: ResourceInventoryPanelProps) {
  return (
    <section
      className="grid min-w-0 min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
      aria-label={ariaLabel}
    >
      {toolbar}
      <div className="custom-scrollbar min-h-0 overflow-y-auto">
        <DataTableRequestState error={error ?? null}>
          {children}
        </DataTableRequestState>
      </div>
      {!error && pagination}
    </section>
  )
}
