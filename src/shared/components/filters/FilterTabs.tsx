import { useTranslation } from '@/hooks/useTranslation'
import { SkeletonBlock } from '@/shared/components/data-table'

interface FilterTab {
  label: string
  value: string
}

interface FilterTabsProps {
  tabs: FilterTab[]
  value: string
  onChange: (value: string) => void
  ariaLabel?: string
}

export function FilterTabs({ tabs, value, onChange, ariaLabel = 'Filter tabs' }: FilterTabsProps) {
  return (
    <div className="flex h-10 overflow-x-auto rounded-xl bg-surface-muted p-0.5" aria-label={ariaLabel} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value || 'all'}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          className={`shrink-0 rounded-[10px] px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15 sm:text-sm ${
            value === tab.value
              ? 'bg-surface text-accent shadow-sm'
              : 'text-text-muted hover:text-text-secondary'
          }`}
          onClick={() => { onChange(tab.value) }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function FilterPanelSkeleton() {
  const { t } = useTranslation()

  return (
    <div className="space-y-4" aria-busy="true" aria-label={t('common.loadingFilters')}>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-1.5">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}
