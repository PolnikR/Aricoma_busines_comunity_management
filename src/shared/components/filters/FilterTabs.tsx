import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
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
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const activate = (index: number) => {
    const tab = tabs[index]
    if (!tab) return
    onChange(tab.value)
    tabRefs.current[index]?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (tabs.length === 0) return

    let nextIndex: number | null = null
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1

    if (nextIndex !== null) {
      event.preventDefault()
      activate(nextIndex)
    }
  }

  return (
    <div className="flex h-10 overflow-x-auto rounded-xl bg-surface-muted p-0.5" aria-label={ariaLabel} role="tablist">
      {tabs.map((tab, index) => {
        const isSelected = value === tab.value
        return (
          <button
            key={tab.value || 'all'}
            ref={(element) => { tabRefs.current[index] = element }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            className={`shrink-0 rounded-[10px] px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15 sm:text-sm ${
              isSelected
                ? 'bg-surface text-accent shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
            onClick={() => { onChange(tab.value) }}
            onKeyDown={(event) => { handleKeyDown(event, index) }}
          >
            {tab.label}
          </button>
        )
      })}
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
