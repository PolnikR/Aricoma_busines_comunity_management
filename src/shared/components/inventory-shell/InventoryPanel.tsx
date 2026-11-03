import type { ReactNode } from 'react'
import {
  DataTableRequestState,
  type DataTableRequestError,
} from '@/shared/components/data-table'
import { DataTableSurface } from '@/shared/components/data-table/DataTableSurface'
import { useInventoryFrame } from './InventoryCompositionContext'

interface InventoryPanelProps {
  ariaLabel: string
  toolbar: ReactNode
  children: ReactNode
  pagination?: ReactNode
  error?: DataTableRequestError | null
  hasCachedData?: boolean
  frame?: 'standalone' | 'embedded'
}

export function InventoryPanel({
  ariaLabel,
  toolbar,
  children,
  pagination,
  error,
  hasCachedData = false,
  frame: frameOverride,
}: InventoryPanelProps) {
  const frame = useInventoryFrame(frameOverride)
  return (
    <DataTableSurface
      ariaLabel={ariaLabel}
      frame={frame}
      toolbar={toolbar}
      pagination={(!error || hasCachedData) && pagination}
    >
      <DataTableRequestState error={error ?? null} hasCachedData={hasCachedData}>
        {children}
      </DataTableRequestState>
    </DataTableSurface>
  )
}
