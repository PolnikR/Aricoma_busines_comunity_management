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
      className={cn('grid grid-cols-1 gap-2 p-2 sm:grid-cols-2 xl:grid-cols-4', className)}
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
              'group relative flex min-h-[82px] min-w-0 items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15',
              isSelected
                ? 'border-accent/35 bg-accent-soft text-text-primary shadow-sm'
                : 'border-border bg-surface text-text-secondary hover:border-accent/30 hover:bg-surface-subtle',
              item.disabled ? 'cursor-not-allowed opacity-50' : undefined,
            )}
          >
            {item.icon ? (
              <span className={cn(
                'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border text-sm',
                isSelected ? 'border-accent/20 bg-accent text-white' : 'border-border bg-surface-muted text-accent',
              )} aria-hidden="true">
                {item.icon}
              </span>
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">{item.label}</span>
                {item.meta ? <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-text-subtle">{item.meta}</span> : null}
              </span>
              {item.description ? <span className="mt-1 block text-xs leading-4 text-text-muted">{item.description}</span> : null}
            </span>
            {isSelected ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" aria-hidden="true" /> : null}
          </button>
        )
      })}
    </div>
  )
}
