import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'
import { Input } from '@/shared/components/form/FormControls'
import { ListSkeleton } from '@/shared/components/list-skeleton'

// Single-line row: p-2 + 16 px text line + border. Rows are measured after render.
const ESTIMATED_ROW_HEIGHT = 36
const ROW_GAP = 4
const LIST_PADDING = 8

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
  isSearching?: boolean
  isRetrying?: boolean
  error?: Error | null
  errorTitle: string
  staleErrorTitle: string
  staleErrorDescription: string
  retryLabel: string
  onRetry?: () => void
  searchValue?: string
  onSearchChange?: (value: string) => void
  renderItemAction?: (item: string) => ReactNode
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
  isSearching = false,
  isRetrying = false,
  error,
  errorTitle,
  staleErrorTitle,
  staleErrorDescription,
  retryLabel,
  onRetry,
  searchValue,
  onSearchChange,
  renderItemAction,
}: ResourceSidebarProps) {
  const [search, setSearch] = useState('')
  const isServerSearch = searchValue !== undefined && onSearchChange !== undefined
  const currentSearch = isServerSearch ? searchValue : search
  const normalizedItems = useMemo(
    () => Array.from(new Set(items)).sort(),
    [items],
  )
  const filteredItems = useMemo(
    () => isServerSearch ? normalizedItems : normalizedItems.filter((item) => {
      const query = search.toLowerCase()
      return item.toLowerCase().includes(query)
        || itemLabels[item]?.toLowerCase().includes(query)
    }),
    [isServerSearch, itemLabels, normalizedItems, search],
  )
  const handleRetry = () => { onRetry?.() }
  const showSkeleton = isLoading || isSearching
  const showBlockingError = !showSkeleton && Boolean(error) && normalizedItems.length === 0
  const showStaleError = !showSkeleton && Boolean(error) && normalizedItems.length > 0
  const showList = !showSkeleton && !showBlockingError && filteredItems.length > 0
  const viewportRef = useRef<HTMLDivElement>(null)
  const staleBannerRef = useRef<HTMLDivElement>(null)
  // Height of the stale banner that scrolls above the list inside the viewport.
  const [listOffset, setListOffset] = useState(0)
  const [draggingItem, setDraggingItem] = useState<string | null>(null)
  const draggingIndex = draggingItem === null ? -1 : filteredItems.indexOf(draggingItem)

  useLayoutEffect(() => {
    const banner = staleBannerRef.current
    const measure = () => { setListOffset(banner?.offsetHeight ?? 0) }
    measure()
    if (!banner || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(banner)
    return () => { observer.disconnect() }
  }, [showStaleError])

  // The virtualizer's functions are only used during this render, never passed to memoized children.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: showList ? filteredItems.length : 0,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    gap: ROW_GAP,
    overscan: 10,
    // The list starts below the stale banner; rows are positioned relative to the list.
    scrollMargin: listOffset,
    // Vertical list padding lives in the virtualizer, not in CSS before the list.
    paddingStart: LIST_PADDING,
    paddingEnd: LIST_PADDING,
    getItemKey: index => filteredItems[index] ?? index,
    // Keep the dragged row mounted while the list scrolls during a drag.
    rangeExtractor: (range) => {
      const indexes = defaultRangeExtractor(range)
      return draggingIndex < 0 || indexes.includes(draggingIndex)
        ? indexes
        : [...indexes, draggingIndex].sort((left, right) => left - right)
    },
  })

  useEffect(() => {
    virtualizer.scrollToOffset(0)
  }, [currentSearch, virtualizer])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-subtle">
      <div className="shrink-0 border-b border-border p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">{title}</h3>
        <Input
          type="search"
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={currentSearch}
          disabled={isLoading}
          onChange={event => {
            if (isServerSearch) {
              onSearchChange(event.target.value)
            } else {
              setSearch(event.target.value)
            }
          }}
          size="sm"
          className="text-xs"
        />
      </div>
      <div
        ref={viewportRef}
        data-testid="resource-sidebar-viewport"
        className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2"
        aria-busy={showSkeleton}
      >
        {showSkeleton ? (
          <div className="py-2">
            <ListSkeleton rowCount={8} ariaLabel={loadingLabel} />
          </div>
        ) : showBlockingError && error ? (
          <div className="py-2">
            <FetchErrorAlert
              title={errorTitle}
              description={error.message}
              retryLabel={retryLabel}
              isRetrying={isRetrying}
              onRetry={handleRetry}
            />
          </div>
        ) : (
          <>
            {/* Scrolls away with the list; the virtualizer offsets the list by its height (scrollMargin). */}
            {showStaleError ? (
              <div ref={staleBannerRef} data-testid="resource-sidebar-stale-banner" className="pt-2">
                <FetchErrorAlert
                  title={staleErrorTitle}
                  description={staleErrorDescription}
                  retryLabel={retryLabel}
                  isRetrying={isRetrying}
                  onRetry={handleRetry}
                />
              </div>
            ) : null}
            {!showList ? (
              <div className="py-6 text-center text-xs text-text-subtle">
                {currentSearch ? noMatchesLabel : noItemsLabel}
              </div>
            ) : (
              <div role="list" aria-label={title} className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const item = filteredItems[virtualItem.index] ?? ''
                  return (
                    <div
                      role="listitem"
                      key={virtualItem.key}
                      ref={virtualizer.measureElement}
                      data-index={virtualItem.index}
                      aria-setsize={filteredItems.length}
                      aria-posinset={virtualItem.index + 1}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(dragDataKey, item)
                        setDraggingItem(item)
                      }}
                      onDragEnd={() => { setDraggingItem(null) }}
                      style={{ transform: `translateY(${String(virtualItem.start - listOffset)}px)` }}
                      className={cn('absolute left-0 top-0 w-full cursor-grab rounded-md border border-border bg-surface-muted text-left text-xs text-text-primary transition-colors hover:border-border-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus', renderItemAction ? 'flex min-h-9 items-center justify-between gap-2 px-2 py-1' : 'p-2')}
                    >
                      <div className="min-w-0">
                        <span className="block break-words font-medium">{itemLabels[item] ?? item}</span>
                        {itemLabels[item] && itemLabels[item] !== item ? (
                          <span className="mt-0.5 block font-mono text-[10px] text-text-muted">{item}</span>
                        ) : null}
                      </div>
                      {renderItemAction?.(item)}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
