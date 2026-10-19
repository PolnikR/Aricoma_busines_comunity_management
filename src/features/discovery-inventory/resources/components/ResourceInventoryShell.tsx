import type { ComponentProps } from 'react'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'

export function ResourceInventoryShell(props: Omit<ComponentProps<typeof InventoryShell>, 'compactSpacing' | 'surfaceMinHeightClassName'>) {
  return <InventoryShell {...props} compactSpacing />
}
