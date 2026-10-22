import type { ReactNode } from 'react'

interface DataTableSurfaceProps {
  ariaLabel: string
  toolbar: ReactNode
  children: ReactNode
  pagination?: ReactNode
  variant?: 'default' | 'flat'
}

export function DataTableSurface({ ariaLabel, toolbar, children, pagination, variant = 'default' }: DataTableSurfaceProps) {
  const flat = variant === 'flat'
  return (
    <section
      className={`grid min-w-0 min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-surface ${flat ? '' : 'rounded-[20px] border border-border shadow-sm'}`}
      aria-label={ariaLabel}
    >
      {toolbar}
      <div
        className={`custom-scrollbar min-h-0 ${flat ? 'overflow-auto focus-visible:outline-2 focus-visible:outline-focus focus-visible:-outline-offset-2' : 'overflow-y-auto'}`}
        tabIndex={flat ? 0 : undefined}
        role={flat ? 'group' : undefined}
        aria-label={flat ? ariaLabel : undefined}
      >{children}</div>
      {pagination}
    </section>
  )
}
