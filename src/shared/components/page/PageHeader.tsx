import type { ReactNode } from 'react'

interface PageHeaderProps {
  // Ignored: no longer rendered. Kept until every caller stops passing it.
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

// The h1 line height (h-9) matches size="sm" buttons so title and actions share one row.
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-4 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold leading-9 tracking-[-0.01em] text-text-primary">{title}</h1>
        {description ? <p className="max-w-3xl text-sm text-text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  )
}
