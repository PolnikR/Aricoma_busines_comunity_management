import type { ComponentProps } from 'react'
import type { DataTableRequestError } from '@/shared/components/data-table'
import { InventoryPanel } from '@/shared/components/inventory-shell/InventoryPanel'

export type ResourceInventoryPanelError = DataTableRequestError

export function ResourceInventoryPanel(props: Omit<ComponentProps<typeof InventoryPanel>, 'frame'>) {
  return <InventoryPanel {...props} frame="embedded" />
}
