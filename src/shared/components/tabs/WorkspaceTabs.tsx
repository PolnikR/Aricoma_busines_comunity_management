import { useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

export interface WorkspaceTabItem<T extends string> {
  value: T
  label: ReactNode
  description?: ReactNode
  icon?: ReactNode
  meta?: ReactNode
  disabled?: boolean
}

interface WorkspaceTabsProps<T extends string> {
  items: readonly WorkspaceTabItem<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

export function WorkspaceTabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: WorkspaceTabsProps<T>) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const focusItem = (index: number) => {
    const nextIndex = items.findIndex((item, itemIndex) => itemIndex === index && !item.disabled)
    if (nextIndex < 0) return
    const item = items[nextIndex]
    if (!item) return
    onChange(item.value)
    tabRefs.current[nextIndex]?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (items.length < 2) return

    let nextIndex: number | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % items.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + items.length) % items.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = items.length - 1
    }

    if (nextIndex === null) return
    event.preventDefault()

    for (let offset = 0; offset < items.length; offset += 1) {
      const candidateIndex = (nextIndex + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -offset : offset) + items.length * 2) % items.length
      const candidate = items[candidateIndex]
      if (candidate && !candidate.disabled) {
        focusItem(candidateIndex)
        return
      }
    }
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'grid grid-cols-1 divide-y divide-border bg-surface sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4',
        className,
      )}
    >
      {items.map((item, index) => {
        const isSelected = item.value === value
        return (
          <button
            key={item.value}
            ref={(element) => { tabRefs.current[index] = element }}
            type="button"
            role="tab"
            id={`${item.value}-tab`}
            aria-selected={isSelected}
            aria-controls={`${item.value}-panel`}
            tabIndex={isSelected ? 0 : -1}
            disabled={item.disabled}
            onClick={() => { onChange(item.value) }}
            onKeyDown={(event) => { handleKeyDown(event, index) }}
            className={cn(
              'group relative flex min-h-16 min-w-0 items-start gap-2.5 border border-transparent px-3 py-2.5 text-left transition focus-visible:z-10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15',
              isSelected
                ? 'bg-surface-subtle text-text-primary before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-accent before:content-[\'\']'
                : 'text-text-secondary hover:bg-surface-subtle',
              item.disabled ? 'cursor-not-allowed opacity-50' : undefined,
            )}
          >
            {item.icon ? (
              <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center text-sm', isSelected ? 'text-accent' : 'text-text-muted')} aria-hidden="true">
                {item.icon}
              </span>
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className={cn('truncate text-sm font-semibold', isSelected ? 'text-accent' : 'text-text-primary')}>{item.label}</span>
                {item.meta ? <span className="shrink-0">{item.meta}</span> : null}
              </span>
              {item.description ? <span className="mt-1 block truncate text-[11px] leading-4 text-text-muted">{item.description}</span> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
