import type { ReactNode } from 'react'
import {
  DataTableRequestState,
  type DataTableRequestError,
} from '@/shared/components/data-table'
import { DataTableSurface } from '@/shared/components/data-table/DataTableSurface'

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
    <DataTableSurface
      ariaLabel={ariaLabel}
      toolbar={toolbar}
      pagination={(!error || hasCachedData) && pagination}
    >
      <DataTableRequestState error={error ?? null} hasCachedData={hasCachedData}>
        {children}
      </DataTableRequestState>
    </DataTableSurface>
  )
}
