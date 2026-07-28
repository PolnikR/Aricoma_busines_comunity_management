import { useMemo, useState } from 'react'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { Input } from '@/shared/components/form/FormControls'
import { ListSkeleton } from '@/shared/components/list-skeleton'

interface ResourceSidebarProps {
  items: string[]
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
  onSelect?: (item: string) => void
}

export function ResourceSidebar({
  items,
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
  onSelect,
}: ResourceSidebarProps) {
  const [search, setSearch] = useState('')
  const normalizedItems = useMemo(
    () => Array.from(new Set(items)).sort(),
    [items],
  )
  const filteredItems = useMemo(
    () => normalizedItems.filter(item => item.toLowerCase().includes(search.toLowerCase())),
    [normalizedItems, search],
  )
  const handleRetry = () => { onRetry?.() }

  return (
    <div className="flex flex-col overflow-hidden bg-[#fbfdff]">
      <div className="shrink-0 border-b border-[#edf2f7] p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7b8ca4]">{title}</h3>
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
      <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
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
              <div className="py-4 text-center text-xs text-[#91a4bc]">
                {search ? noMatchesLabel : noItemsLabel}
              </div>
            ) : (
              filteredItems.map(item => (
                <button
                  type="button"
                  key={item}
                  draggable
                  onClick={() => { onSelect?.(item) }}
                  onDragStart={event => {
                    event.dataTransfer.setData(dragDataKey, item)
                    onSelect?.(item)
                  }}
                  className="mb-1 w-full cursor-grab rounded-md border border-[#d9e6f1] bg-[#f0f5fa] p-2 text-left text-xs text-[#18253d] transition-all hover:border-[#b9d5e8] hover:bg-[#e3edf6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1596dd]"
                >
                  {item}
                </button>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
