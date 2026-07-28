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
  className,
}: ResourceSelectionCardProps) {
  const [isDragOver, setIsDragOver] = useState(false)

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
        'flex h-44 min-h-44 flex-col gap-2 bg-[#f8fbfe] p-3 transition',
        isDragOver ? 'bg-[#e3edf6] ring-1 ring-inset ring-[#1596dd]' : undefined,
        className,
      )}
    >
      {title ? <h3 className="shrink-0 text-sm font-semibold text-[#18253d]">{title}</h3> : null}
      {description ? <p className="shrink-0 text-xs text-[#71819a]">{description}</p> : null}
      {items.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center text-center text-xs text-[#91a4bc]">
          {emptyText}
        </div>
      ) : (
        <div
          className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-2"
          tabIndex={0}
          aria-label={ariaLabel}
        >
          {items.map(item => (
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
          ))}
        </div>
      )}
    </section>
  )
}
