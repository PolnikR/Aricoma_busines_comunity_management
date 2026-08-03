import { useState } from 'react'
import { cn } from '@/shared/utils/cn'

interface ResourceSelectionCardProps {
  title?: string
  titleVariant?: 'heading' | 'inline'
  description?: string
  items: string[]
  emptyText: string
  removeLabel: string
  ariaLabel: string
  dropDataKey?: string
  onResourceDrop?: (resource: string) => void
  onResourceRemove?: (resource: string) => void
  selectedItems?: readonly string[]
  onResourceSelectionChange?: (resource: string, selected: boolean) => void
  selectionSummary?: string
  onClear?: () => void
  clearLabel?: string
  className?: string
}

export function ResourceSelectionCard({
  title,
  titleVariant = 'heading',
  description,
  items,
  emptyText,
  removeLabel,
  ariaLabel,
  dropDataKey,
  onResourceDrop,
  onResourceRemove,
  selectedItems,
  onResourceSelectionChange,
  selectionSummary,
  onClear,
  clearLabel,
  className,
}: ResourceSelectionCardProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const isSelectionMode = selectedItems !== undefined && onResourceSelectionChange !== undefined
  const selectedItemSet = new Set(selectedItems)

  return (
    <section
      aria-label={items.length === 0 ? ariaLabel : undefined}
      onDragOver={dropDataKey && onResourceDrop ? event => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
        setIsDragOver(true)
      } : undefined}
      onDragLeave={dropDataKey && onResourceDrop ? () => { setIsDragOver(false) } : undefined}
      onDrop={dropDataKey && onResourceDrop ? event => {
        event.preventDefault()
        setIsDragOver(false)
        const resource = event.dataTransfer.getData(dropDataKey)
        if (resource) onResourceDrop(resource)
      } : undefined}
      className={cn(
        'flex flex-col gap-2 bg-surface-subtle p-3 transition',
        isSelectionMode ? 'h-52 min-h-52' : 'h-44 min-h-44',
        isDragOver ? 'bg-surface-muted ring-1 ring-inset ring-focus' : undefined,
        className,
      )}
    >
      {title || (onClear && clearLabel) ? (
        <div className="flex shrink-0 items-start justify-between gap-2">
          {title ? (
            titleVariant === 'inline' ? (
              <p className="min-w-0 truncate whitespace-nowrap text-xs font-normal text-text-secondary">
                {title}
              </p>
            ) : (
              <h3 className="min-w-0 text-sm font-semibold text-text-primary">{title}</h3>
            )
          ) : null}
          {onClear && clearLabel ? (
            <button
              type="button"
              onClick={onClear}
              className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-md text-text-muted transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/30"
              aria-label={clearLabel}
              title={clearLabel}
            >
              <span aria-hidden="true">✕</span>
            </button>
          ) : null}
        </div>
      ) : null}
      {description ? <p className="shrink-0 text-xs text-text-muted">{description}</p> : null}
      {items.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center text-center text-xs text-text-subtle">
          {emptyText}
        </div>
      ) : (
        <div
          className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-2"
          tabIndex={isSelectionMode ? undefined : 0}
          role={isSelectionMode ? 'group' : undefined}
          aria-label={ariaLabel}
        >
          {items.map(item => {
            const isSelected = selectedItemSet.has(item)

            if (isSelectionMode) {
              return (
                <label
                  key={item}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md border p-2 text-xs transition hover:border-border-strong focus-within:border-accent focus-within:ring-2 focus-within:ring-focus/15',
                    isSelected
                      ? 'border-border bg-surface text-text-primary'
                      : 'border-border bg-surface-subtle text-text-secondary',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={event => {
                      onResourceSelectionChange(item, event.currentTarget.checked)
                    }}
                    className="size-4 shrink-0 cursor-pointer accent-accent"
                  />
                  <span className="min-w-0 truncate">{item}</span>
                </label>
              )
            }

            return (
              <div
                key={item}
                className="group flex items-center justify-between rounded-md border border-border bg-surface p-2 text-xs text-text-primary hover:border-border-strong"
              >
                <span className="min-w-0 truncate">{item}</span>
                {onResourceRemove ? (
                  <button
                    type="button"
                    onClick={() => { onResourceRemove(item) }}
                    className="ml-2 shrink-0 text-text-subtle opacity-0 transition-opacity hover:text-error-600 group-hover:opacity-100 focus:opacity-100"
                    aria-label={`${removeLabel}: ${item}`}
                    title={removeLabel}
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
      {selectionSummary ? (
        <p
          className="-mx-3 -mb-3 shrink-0 border-t border-border bg-surface-subtle px-3 py-2 text-xs text-text-muted"
          aria-live="polite"
        >
          {selectionSummary}
        </p>
      ) : null}
    </section>
  )
}
