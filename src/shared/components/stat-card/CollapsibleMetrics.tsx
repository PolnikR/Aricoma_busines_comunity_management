import { useId } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { SkeletonBlock } from '@/shared/components/data-table'
import { ChevronDownIcon } from '@/shared/icons/Icons'
import { useStoredBoolean } from '@/shared/hooks/useStoredBoolean'
import { StatCard } from './StatCard'

export interface MetricItem {
  label: string
  value: string
  helper?: string
  icon: ReactNode
  isHelperLoading?: boolean
}

interface CollapsibleMetricsProps {
  items: MetricItem[]
  storageKey: string
  isLoading?: boolean
}

export function CollapsibleMetrics({ items, storageKey, isLoading = false }: CollapsibleMetricsProps) {
  const { t } = useTranslation()
  const [isCollapsed, setIsCollapsed] = useStoredBoolean(storageKey, true)
  const gridId = useId()

  if (isCollapsed) {
    return (
      <button
        type="button"
        aria-expanded={false}
        aria-busy={isLoading ? true : undefined}
        onClick={() => { setIsCollapsed(false) }}
        className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-surface px-3 py-1.5 text-left text-xs text-text-muted transition hover:border-accent hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15"
      >
        {items.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1">
            <strong className="font-semibold text-text-primary">
              {isLoading ? <SkeletonBlock className="h-3 w-8" /> : item.value}
            </strong>
            {' '}{item.label}{' '}
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1 font-medium text-accent">
          {t('metrics.showDetails')}
          <ChevronDownIcon className="size-3.5" />
        </span>
      </button>
    )
  }

  return (
    <div className="flex shrink-0 items-start gap-2">
      <div id={gridId} className="grid flex-1 grid-cols-2 gap-2.5 xl:grid-cols-4">
        {items.map((item) => (
          <StatCard key={item.label} size="sm" isLoading={isLoading} {...item} />
        ))}
      </div>
      <button
        type="button"
        aria-expanded
        aria-controls={gridId}
        aria-label={t('metrics.hide')}
        title={t('metrics.hide')}
        onClick={() => { setIsCollapsed(true) }}
        className="flex size-7 shrink-0 items-center justify-center rounded-lg text-text-muted transition hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15"
      >
        <ChevronDownIcon className="size-4 rotate-180" />
      </button>
    </div>
  )
}
