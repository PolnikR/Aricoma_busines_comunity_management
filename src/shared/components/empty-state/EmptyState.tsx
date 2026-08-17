import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-[22px] border border-dashed border-border-strong bg-surface-subtle px-6 py-12 text-center" role="status">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent shadow-sm">
        <span className="text-sm font-semibold">AB</span>
      </div>
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
