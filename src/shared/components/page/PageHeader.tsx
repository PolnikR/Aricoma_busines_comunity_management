import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-5 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-text-primary sm:text-[28px]">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-text-muted">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </div>
  )
}
