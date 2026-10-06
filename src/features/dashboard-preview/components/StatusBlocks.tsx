import { Button } from '@/shared/components/button/Button'
import { StateCell } from '@/shared/components/data-table'
import { AlertTriangleIcon, ChevronRightIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'
import type { AttentionItem, HealthRow, ProviderStatus } from '../model/mockDashboardData'
import { toneSoftClass } from '../model/statusTone'
import { SegmentedBar } from './Charts'

interface AttentionListProps {
  items: AttentionItem[]
  // 'rows' gives each issue a full-width row with an action button (triage layouts).
  layout?: 'stack' | 'rows'
}

export function AttentionList({ items, layout = 'stack' }: AttentionListProps) {
  return (
    <ul className="divide-y divide-border">
      {items.map(item => (
        <li
          key={item.id}
          className={cn(
            'flex gap-3 py-2.5 first:pt-0 last:pb-0',
            layout === 'rows' ? 'items-center' : 'items-start',
          )}
        >
          <span className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-lg',
            toneSoftClass[item.severity === 'error' ? 'error' : 'warn'],
          )}>
            <AlertTriangleIcon className="size-4" />
          </span>
          <div className={cn('min-w-0 flex-1', layout === 'rows' && 'sm:flex sm:items-center sm:gap-4')}>
            <div className={cn('min-w-0', layout === 'rows' && 'sm:w-64 sm:shrink-0')}>
              <p className="flex items-baseline gap-1.5 text-[13px] font-semibold text-text-primary">
                <span className="truncate">{item.title}</span>
              </p>
              <p className="truncate font-mono text-[11px] text-text-secondary">{item.subject}</p>
            </div>
            <p className={cn('text-xs text-text-muted', layout === 'rows' ? 'mt-0.5 min-w-0 flex-1 truncate sm:mt-0' : 'mt-0.5')}>
              {item.detail}
            </p>
            {layout === 'stack' ? (
              <p className="mt-1 text-[11px] text-text-subtle">{item.category} · {item.age}</p>
            ) : null}
          </div>
          {layout === 'rows' ? (
            <>
              <span className="hidden w-28 shrink-0 text-[11px] text-text-subtle md:block">{item.category}</span>
              <span className="hidden w-20 shrink-0 text-right text-[11px] text-text-subtle tabular-nums md:block">{item.age}</span>
              <Button size="xs" variant="outline" className="shrink-0 sm:w-32" title="Not wired in preview">{item.actionLabel}</Button>
            </>
          ) : (
            <button
              type="button"
              aria-label={`${item.actionLabel}: ${item.subject}`}
              title={`${item.actionLabel} (not wired in preview)`}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-text-subtle transition hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

interface HealthListProps {
  rows: HealthRow[]
}

// One row per resource kind: status, distribution bar, total. Status first, bar second.
export function HealthList({ rows }: HealthListProps) {
  return (
    <ul className="divide-y divide-border">
      {rows.map(row => (
        <li key={row.id}>
          <button
            type="button"
            title={`Opens ${row.drillTo} (not wired in preview)`}
            className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-lg px-2 py-2.5 text-left transition hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15 sm:grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)_7rem_auto]"
          >
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-text-primary">{row.label}</span>
              <StateCell tone={row.tone} label={row.summary} />
            </span>
            <SegmentedBar slices={row.slices} className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto" />
            <span className="hidden text-right text-xs text-text-muted sm:block">
              <strong className="text-sm font-semibold text-text-primary tabular-nums">{row.total}</strong> total
            </span>
            <ChevronRightIcon className="size-4 text-text-subtle transition group-hover:text-accent" />
          </button>
        </li>
      ))}
    </ul>
  )
}

export function ProviderList({ providers }: { providers: ProviderStatus[] }) {
  return (
    <ul className="divide-y divide-border">
      {providers.map(provider => (
        <li key={provider.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-text-primary">{provider.name}</p>
            <p className="truncate text-[11px] text-text-muted">{provider.kind}</p>
          </div>
          <div className="shrink-0 text-right">
            <StateCell tone={provider.tone} label={provider.status} />
            <p className="text-[11px] text-text-subtle">{provider.lastDiscovery}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
