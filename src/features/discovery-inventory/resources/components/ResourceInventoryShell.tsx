import type { ComponentProps } from 'react'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'

// On short desktop viewports the card keeps room for the table header, a few rows and pagination;
// ResourceViewportFrame scrolls the route instead of squeezing the rows further.
export const RESOURCE_INVENTORY_MIN_HEIGHT = 'lg:min-h-[480px]'

export function ResourceInventoryShell(props: Omit<ComponentProps<typeof InventoryShell>, 'surfaceMinHeightClassName'>) {
  return <InventoryShell {...props} surfaceMinHeightClassName={RESOURCE_INVENTORY_MIN_HEIGHT} />
}
