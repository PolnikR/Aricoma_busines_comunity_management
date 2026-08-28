import { useMemo, useState } from 'react'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { Input } from '@/shared/components/form/FormControls'
import { ListSkeleton } from '@/shared/components/list-skeleton'

interface ResourceSidebarProps {
  items: string[]
  itemLabels?: Record<string, string>
  title: string
  searchPlaceholder: string
  loadingLabel: string
  noItemsLabel: string
  noMatchesLabel: string
  dragDataKey: string
  isLoading?: boolean
  isRetrying?: boolean
  error?: Error | null
  errorTitle: string
  staleErrorTitle: string
  staleErrorDescription: string
  retryLabel: string
  onRetry?: () => void
}

export function ResourceSidebar({
  items,
  itemLabels = {},
  title,
  searchPlaceholder,
  loadingLabel,
  noItemsLabel,
  noMatchesLabel,
  dragDataKey,
  isLoading = false,
  isRetrying = false,
  error,
  errorTitle,
  staleErrorTitle,
  staleErrorDescription,
  retryLabel,
  onRetry,
}: ResourceSidebarProps) {
  const [search, setSearch] = useState('')
  const normalizedItems = useMemo(
    () => Array.from(new Set(items)).sort(),
    [items],
  )
  const filteredItems = useMemo(
    () => normalizedItems.filter((item) => {
      const query = search.toLowerCase()
      return item.toLowerCase().includes(query)
        || itemLabels[item]?.toLowerCase().includes(query)
    }),
    [itemLabels, normalizedItems, search],
  )
  const handleRetry = () => { onRetry?.() }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-subtle">
      <div className="shrink-0 border-b border-border p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">{title}</h3>
        <Input
          type="search"
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={search}
          disabled={isLoading}
          onChange={event => { setSearch(event.target.value) }}
          size="sm"
          className="text-xs"
        />
      </div>
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2" aria-busy={isLoading}>
        {isLoading ? (
          <ListSkeleton rowCount={8} ariaLabel={loadingLabel} />
        ) : error && normalizedItems.length === 0 ? (
          <FetchErrorAlert
            title={errorTitle}
            description={error.message}
            retryLabel={retryLabel}
            isRetrying={isRetrying}
            onRetry={handleRetry}
          />
        ) : (
          <>
            {error ? (
              <FetchErrorAlert
                className="mb-2"
                title={staleErrorTitle}
                description={staleErrorDescription}
                retryLabel={retryLabel}
                isRetrying={isRetrying}
                onRetry={handleRetry}
              />
            ) : null}
            {filteredItems.length === 0 ? (
              <div className="py-4 text-center text-xs text-text-subtle">
                {search ? noMatchesLabel : noItemsLabel}
              </div>
            ) : (
              <div role="list" aria-label={title}>
                {filteredItems.map(item => (
                <div
                  role="listitem"
                  key={item}
                  draggable
                  onDragStart={event => {
                    event.dataTransfer.setData(dragDataKey, item)
                  }}
                  className="mb-1 w-full cursor-grab rounded-md border border-border bg-surface-muted p-2 text-left text-xs text-text-primary transition-all hover:border-border-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <span className="block font-medium">{itemLabels[item] ?? item}</span>
                  {itemLabels[item] && itemLabels[item] !== item ? (
                    <span className="mt-0.5 block font-mono text-[10px] text-text-muted">{item}</span>
                  ) : null}
                </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
