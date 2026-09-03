import type { ReactNode } from 'react'

interface DataTableSurfaceProps {
  ariaLabel: string
  toolbar: ReactNode
  children: ReactNode
  pagination?: ReactNode
}

export function DataTableSurface({ ariaLabel, toolbar, children, pagination }: DataTableSurfaceProps) {
  return (
    <section
      className="grid min-w-0 min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[20px] border border-border bg-surface shadow-sm"
      aria-label={ariaLabel}
    >
      {toolbar}
      <div className="custom-scrollbar min-h-0 overflow-y-auto">{children}</div>
      {pagination}
    </section>
  )
}
