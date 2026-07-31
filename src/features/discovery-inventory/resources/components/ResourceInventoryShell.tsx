import type { ReactNode } from 'react'
import { Card } from '@/shared/components/card/Card'

interface ResourceInventoryShellProps {
  metrics: ReactNode
  inventoryTitle: string
  inventoryDescription: string
  tabs: ReactNode
  notice?: ReactNode
  children: ReactNode
}

export function ResourceInventoryShell({
  metrics,
  inventoryTitle,
  inventoryDescription,
  tabs,
  notice,
  children,
}: ResourceInventoryShellProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 lg:min-h-0">
      {metrics}
      {notice}
      <section className="flex flex-1 flex-col lg:min-h-0" aria-label={inventoryTitle}>
        <Card className="relative flex flex-1 flex-col overflow-hidden p-0 sm:p-0 lg:min-h-0">
          <div className="flex shrink-0 flex-col gap-2 border-b border-[#e3edf6] px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#17233d]">{inventoryTitle}</h2>
              <p className="text-xs text-[#71819a]">{inventoryDescription}</p>
            </div>
            {tabs}
          </div>
          <div className="flex flex-1 flex-col overflow-hidden bg-[#f5f8fc] p-3 lg:min-h-0">
            {children}
          </div>
        </Card>
      </section>
    </div>
  )
}
