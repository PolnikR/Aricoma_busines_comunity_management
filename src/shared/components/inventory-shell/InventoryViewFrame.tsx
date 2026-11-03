import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'
import { InventoryFrameContext, InventoryNavigationContext } from './InventoryCompositionContext'

interface InventoryViewFrameProps {
  ariaLabel?: string | undefined
  tabs?: ReactNode
  minHeightClassName?: string
  children: ReactNode
}

export function InventoryViewFrame({ ariaLabel, tabs, minHeightClassName, children }: InventoryViewFrameProps) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-1 flex-col rounded-[20px] border border-border bg-surface shadow-sm',
        minHeightClassName ?? 'lg:min-h-0',
      )}
      aria-label={ariaLabel}
      data-inventory-view=""
    >
      {tabs ? (
        <InventoryNavigationContext.Provider value="embedded">
          <div className="min-w-0 shrink-0 border-b border-border px-4">{tabs}</div>
        </InventoryNavigationContext.Provider>
      ) : null}
      <InventoryFrameContext.Provider value="embedded">
        <div className="flex min-w-0 flex-1 flex-col lg:min-h-0">{children}</div>
      </InventoryFrameContext.Provider>
    </section>
  )
}
