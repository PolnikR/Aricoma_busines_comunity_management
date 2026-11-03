import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

interface DataTableSurfaceProps {
  ariaLabel: string
  toolbar: ReactNode
  children: ReactNode
  pagination?: ReactNode
  frame?: 'standalone' | 'embedded'
}

export function DataTableSurface({ ariaLabel, toolbar, children, pagination, frame = 'standalone' }: DataTableSurfaceProps) {
  return (
    <section
      className={cn(
        'grid min-w-0 min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto]',
        frame === 'standalone' && 'overflow-hidden rounded-[20px] border border-border bg-surface shadow-sm',
        frame === 'embedded' && '[&>*]:bg-transparent',
      )}
      aria-label={ariaLabel}
      data-table-surface={frame === 'standalone' ? '' : undefined}
    >
      {toolbar}
      <div className="custom-scrollbar min-h-0 overflow-y-auto">{children}</div>
      {pagination}
    </section>
  )
}
