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
      className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm lg:min-h-0"
      aria-label={ariaLabel}
    >
      {toolbar}
      <div className="custom-scrollbar flex-1 lg:min-h-[120px] lg:overflow-y-auto">
        <DataTableRequestState error={error ?? null}>
          {children}
        </DataTableRequestState>
      </div>
      {!error && pagination}
    </section>
  )
}
