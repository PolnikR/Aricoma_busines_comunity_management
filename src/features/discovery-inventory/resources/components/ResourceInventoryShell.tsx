import type { ReactNode } from 'react'
import { InventoryViewFrame } from '@/shared/components/inventory-shell/InventoryViewFrame'

interface ResourceInventoryShellProps {
  metrics?: ReactNode
  inventoryTitle?: string
  inventoryDescription?: ReactNode
  tabs?: ReactNode
  notice?: ReactNode
  children: ReactNode
}

export function ResourceInventoryShell({ metrics, inventoryTitle, tabs, notice, children }: ResourceInventoryShellProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 lg:min-h-0 lg:gap-1">
      {metrics}
      {notice}
      <InventoryViewFrame ariaLabel={inventoryTitle} tabs={tabs}>{children}</InventoryViewFrame>
    </div>
  )
}
