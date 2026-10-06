import type { ReactNode } from 'react'
import { StateCell } from '@/shared/components/data-table'
import type { StateTone } from '@/shared/components/data-table'
import { ChevronRightIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'

interface KpiTileProps {
  label: string
  value: ReactNode
  detail: string
  drillTo: string
  // When set, the detail line renders as a status (dot + label) instead of muted helper text.
  tone?: StateTone
  size?: 'md' | 'sm'
  className?: string
}

// StatCard surface, but the whole tile is the drill-down target (e.g. Virtual Machines → Inventory → VM).
export function KpiTile({ label, value, detail, drillTo, tone, size = 'md', className }: KpiTileProps) {
  const isSmall = size === 'sm'
  return (
    <button
      type="button"
      title={`Opens ${drillTo} (not wired in preview)`}
      className={cn(
        'group flex min-w-0 flex-col items-start border border-border bg-surface text-left shadow-[0_12px_28px_-24px_rgba(37,72,112,0.5)] transition hover:border-accent hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15',
        isSmall ? 'gap-0.5 rounded-xl px-3 py-2.5' : 'gap-1.5 rounded-[18px] p-3.5',
        className,
      )}
    >
      <span className="flex w-full min-w-0 items-center gap-2">
        <span className="truncate text-xs font-medium text-text-secondary">{label}</span>
        <ChevronRightIcon className="ml-auto size-3.5 shrink-0 text-text-subtle transition group-hover:text-accent" />
      </span>
      <strong className={cn(
        'font-semibold leading-tight tracking-[-0.01em] text-text-primary tabular-nums',
        isSmall ? 'text-lg' : 'text-2xl',
      )}>
        {value}
      </strong>
      {tone ? (
        <StateCell tone={tone} label={detail} />
      ) : (
        <span className="max-w-full truncate text-[11px] text-text-muted">{detail}</span>
      )}
    </button>
  )
}
