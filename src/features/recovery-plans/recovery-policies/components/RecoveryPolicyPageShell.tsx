import { InventoryViewportFrame } from '@/shared/components/page/InventoryViewportFrame'
import type { ReactNode } from 'react'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'
import { Tabs } from '@/shared/components/tabs/Tabs'
import type { TabItem } from '@/shared/components/tabs/Tabs'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import type { RecoveryPolicyTab } from '../model/recoveryPolicyNavigation'

interface RecoveryPolicyPageShellProps {
  activeTab: RecoveryPolicyTab
  tabs: readonly TabItem<RecoveryPolicyTab>[]
  onTabChange: (tab: RecoveryPolicyTab) => void
  title: string
  description: string
  isFetching?: boolean
  onRefresh?: () => void
  actions?: ReactNode
  inventoryTitle: string
  inventoryDescription: string
  tabsAriaLabel: string
  children: ReactNode
}

export function RecoveryPolicyPageShell({
  activeTab,
  tabs,
  onTabChange,
  title,
  description,
  isFetching,
  onRefresh,
  actions,
  inventoryTitle,
  inventoryDescription,
  tabsAriaLabel,
  children,
}: RecoveryPolicyPageShellProps) {
  return (
    <InventoryViewportFrame>
      <TableToolbar
        title={title}
        description={description}
        isFetching={isFetching ?? false}
        {...(onRefresh ? { onRefresh } : {})}
        actions={actions}
      />

      <InventoryShell
        inventoryTitle={inventoryTitle}
        inventoryDescription={inventoryDescription}
        tabs={(
          <Tabs
            items={tabs}
            value={activeTab}
            onChange={onTabChange}
            ariaLabel={tabsAriaLabel}
            indicator="inset"
            compact
            className="w-full shrink-0 sm:w-auto"
          />
        )}
      >
        {children}
      </InventoryShell>
    </InventoryViewportFrame>
  )
}
