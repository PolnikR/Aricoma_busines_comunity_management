import type { ReactNode } from 'react'

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
      <section
        className="flex min-w-0 flex-1 flex-col rounded-[20px] border border-border bg-surface shadow-sm lg:min-h-0"
        aria-label={inventoryTitle}
        data-resource-view=""
      >
        {tabs ? (
          <div className="min-w-0 shrink-0 border-b border-border px-4">
            {tabs}
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col lg:min-h-0">
          {children}
        </div>
      </section>
    </div>
  )
}
