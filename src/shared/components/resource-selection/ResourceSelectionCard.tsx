import { useState } from 'react'
import { cn } from '@/shared/utils/cn'

interface ResourceSelectionCardProps {
  title?: string
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
        'flex flex-col gap-2 bg-[#f8fbfe] p-3 transition',
        isSelectionMode ? 'h-64 min-h-64' : 'h-44 min-h-44',
        isDragOver ? 'bg-[#e3edf6] ring-1 ring-inset ring-[#1596dd]' : undefined,
        className,
      )}
    >
      {title || (onClear && clearLabel) ? (
        <div className="flex shrink-0 items-start justify-between gap-2">
          {title ? <h3 className="min-w-0 text-sm font-semibold text-[#18253d]">{title}</h3> : null}
          {onClear && clearLabel ? (
            <button
              type="button"
              onClick={onClear}
              className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-md text-[#7f8da2] transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1596dd]/30"
              aria-label={clearLabel}
              title={clearLabel}
            >
              <span aria-hidden="true">✕</span>
            </button>
          ) : null}
        </div>
      ) : null}
      {description ? <p className="shrink-0 text-xs text-[#71819a]">{description}</p> : null}
      {items.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center text-center text-xs text-[#91a4bc]">
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
                    'flex cursor-pointer items-center gap-2 rounded-md border p-2 text-xs transition hover:border-[#b9d5e8] focus-within:border-[#63bdf2] focus-within:ring-2 focus-within:ring-[#1596dd]/15',
                    isSelected
                      ? 'border-[#d9e6f1] bg-white text-[#18253d]'
                      : 'border-[#e1e8ef] bg-[#fbfcfd] text-[#50617a]',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={event => {
                      onResourceSelectionChange(item, event.currentTarget.checked)
                    }}
                    className="size-4 shrink-0 cursor-pointer accent-[#1596dd]"
                  />
                  <span className="min-w-0 truncate">{item}</span>
                </label>
              )
            }

            return (
              <div
                key={item}
                className="group flex items-center justify-between rounded-md border border-[#d9e6f1] bg-white p-2 text-xs text-[#18253d] hover:border-[#b9d5e8]"
              >
                <span className="min-w-0 truncate">{item}</span>
                {onResourceRemove ? (
                  <button
                    type="button"
                    onClick={() => { onResourceRemove(item) }}
                    className="ml-2 shrink-0 text-[#91a4bc] opacity-0 transition-opacity hover:text-[#d4353d] group-hover:opacity-100 focus:opacity-100"
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
          className="-mx-3 -mb-3 shrink-0 border-t border-[#edf2f7] bg-[#fbfdff] px-3 py-2 text-xs text-[#71819a]"
          aria-live="polite"
        >
          {selectionSummary}
        </p>
      ) : null}
    </section>
  )
}
