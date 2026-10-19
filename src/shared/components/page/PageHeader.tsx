import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  variant?: 'default' | 'compact'
}

// The h1 line height (h-9) matches size="sm" buttons so title and actions share one row.
export function PageHeader({ title, description, actions, variant = 'default' }: PageHeaderProps) {
  const compact = variant === 'compact'
  return (
    <div className={compact ? 'flex shrink-0 flex-col flex-wrap gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-x-4' : 'mb-4 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4'}>
      <div className={compact ? 'min-w-0 sm:flex-[1_1_14rem]' : 'min-w-0'}>
        <h1 className={`text-xl font-semibold ${compact ? 'leading-6' : 'leading-9'} tracking-[-0.01em] text-text-primary`}>{title}</h1>
        {description ? <p className={compact ? 'max-w-3xl text-xs leading-4 text-text-muted' : 'max-w-3xl text-sm text-text-muted'}>{description}</p> : null}
      </div>
      {actions ? <div className={compact ? 'flex min-w-0 max-w-full flex-wrap items-center gap-3 sm:ml-auto' : 'flex shrink-0 flex-wrap items-center gap-3'}>{actions}</div> : null}
    </div>
  )
}
