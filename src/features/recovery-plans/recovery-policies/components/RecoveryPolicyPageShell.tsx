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
  eyebrow: string
  title: string
  description: string
  isFetching?: boolean
  onRefresh?: () => void
  actions?: ReactNode
  inventoryTitle?: string
  inventoryDescription?: string
  tabsAriaLabel: string
  children: ReactNode
}

export function RecoveryPolicyPageShell({
  activeTab,
  tabs,
  onTabChange,
  eyebrow,
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
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={eyebrow}
        title={title}
        description={description}
        isFetching={isFetching ?? false}
        {...(onRefresh ? { onRefresh } : {})}
        actions={actions}
      />

      <InventoryShell
        {...(inventoryTitle !== undefined ? { inventoryTitle } : {})}
        {...(inventoryDescription !== undefined ? { inventoryDescription } : {})}
        tabs={(
          <Tabs
            items={tabs}
            value={activeTab}
            onChange={onTabChange}
            ariaLabel={tabsAriaLabel}
            indicator="inset"
          />
        )}
      >
        {children}
      </InventoryShell>
    </div>
  )
}
