import type { ReactNode } from 'react'
import { Card } from '@/shared/components/card/Card'
import { ChevronRightIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'

interface DashboardPanelProps {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  // 'attention' adds an error stripe so the panel reads as a problem list, not another KPI card.
  tone?: 'default' | 'attention' | 'placeholder'
  className?: string | undefined
  bodyClassName?: string
  children: ReactNode
}

// Card with the same header strip as InventoryShell: small semibold title, muted description, border below.
export function DashboardPanel({
  title,
  description,
  action,
  icon,
  tone = 'default',
  className,
  bodyClassName,
  children,
}: DashboardPanelProps) {
  return (
    <Card
      className={cn(
        'relative flex min-w-0 flex-col overflow-hidden p-0 sm:p-0',
        tone === 'attention' && 'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-error-500',
        tone === 'placeholder' && 'border-dashed',
        className,
      )}
    >
      <section aria-label={title} className="flex min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-2.5 border-b border-border px-4 py-2.5">
          {icon}
          <div className="mr-auto min-w-0">
            <h2 className="truncate text-sm font-semibold text-text-primary">{title}</h2>
            {description ? <p className="truncate text-xs text-text-muted">{description}</p> : null}
          </div>
          {action}
        </header>
        <div className={cn('min-h-0 flex-1 p-4', bodyClassName)}>{children}</div>
      </section>
    </Card>
  )
}

interface DrillActionProps {
  label: string
  target: string
}

// Drill-down affordance only: the preview does not navigate yet.
export function DrillAction({ label, target }: DrillActionProps) {
  return (
    <button
      type="button"
      title={`Opens ${target} (not wired in preview)`}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-medium text-accent transition hover:bg-accent-soft hover:text-accent-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15"
    >
      {label}
      <ChevronRightIcon className="size-3.5" />
    </button>
  )
}
