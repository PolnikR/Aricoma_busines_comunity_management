import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow ? <p className="mb-2 text-sm font-medium text-brand-500">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </div>
  )
}