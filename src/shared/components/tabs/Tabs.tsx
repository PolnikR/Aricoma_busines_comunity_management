import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'
import { ChevronLeftIcon, ChevronRightIcon } from '@/shared/icons/Icons'
import { useInventoryNavigation } from '../inventory-shell/InventoryCompositionContext'

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
  accessibleLabel?: string
}

interface TabsProps<T extends string> {
  items: readonly TabItem<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  indicator?: 'edge' | 'inset'
  compact?: boolean
  maxVisibleItems?: number
  appearance?: 'default' | 'embedded'
  className?: string
  scrollControls?: {
    previousLabel: string
    nextLabel: string
  }
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  indicator = 'edge',
  compact = false,
  maxVisibleItems,
  appearance: appearanceOverride,
  className,
  scrollControls,
}: TabsProps<T>) {
  const appearance = useInventoryNavigation(appearanceOverride)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const tabListRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const visibleSlots = maxVisibleItems === undefined ? undefined : Math.max(1, Math.floor(maxVisibleItems))
  const viewportWidth = visibleSlots === undefined ? undefined : `calc(${String(Math.min(items.length, visibleSlots))} * var(--tab-slot-width, 10rem))`
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [canScrollPrevious, setCanScrollPrevious] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const updateScrollState = useCallback(() => {
    const tabList = tabListRef.current
    if (!tabList || !scrollControls) return

    const maxScrollLeft = Math.max(0, tabList.scrollWidth - tabList.clientWidth)
    // Measure against the space without controls so their own width cannot keep
    // them visible after a resize when every tab would otherwise fit.
    const slotWidth = tabRefs.current[0]?.offsetWidth ?? 0
    const wrapperWidth = wrapperRef.current?.clientWidth ?? 0
    const availableWidth = visibleSlots !== undefined && slotWidth > 0
      ? Math.min(wrapperWidth > 0 ? wrapperWidth : tabList.clientWidth, visibleSlots * slotWidth)
      : tabList.clientWidth
    setIsOverflowing(tabList.scrollWidth > availableWidth + 1)
    setCanScrollPrevious(tabList.scrollLeft > 1)
    setCanScrollNext(tabList.scrollLeft < maxScrollLeft - 1)
  }, [scrollControls, visibleSlots])

  const revealSelectedTab = useCallback(() => {
    const selectedIndex = items.findIndex(item => item.value === value)
    const selectedTab = tabRefs.current[selectedIndex]
    if (selectedTab && typeof selectedTab.scrollIntoView === 'function') {
      selectedTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [items, value])

  useEffect(() => {
    if (!scrollControls) return

    const tabList = tabListRef.current
    if (!tabList) return

    updateScrollState()
    const handleResize = () => {
      updateScrollState()
      revealSelectedTab()
    }
    window.addEventListener('resize', handleResize)
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(handleResize)
    resizeObserver?.observe(tabList)
    if (wrapperRef.current) resizeObserver?.observe(wrapperRef.current)

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver?.disconnect()
    }
  }, [items.length, scrollControls, updateScrollState, visibleSlots, revealSelectedTab])

  useEffect(() => {
    if (!scrollControls) return

    revealSelectedTab()
    updateScrollState()
  }, [revealSelectedTab, scrollControls, updateScrollState])

  const activate = (index: number) => {
    const item = items[index]
    if (!item) return
    onChange(item.value)
    tabRefs.current[index]?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (items.length === 0) return

    let nextIndex: number | null = null
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % items.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + items.length) % items.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = items.length - 1

    if (nextIndex !== null) {
      event.preventDefault()
      activate(nextIndex)
    }
  }

  const tabList = (
    <div
      ref={tabListRef}
      className={cn(
        'flex gap-1 overflow-x-auto',
        appearance === 'embedded' ? 'px-0' : 'border-b border-border px-3',
        scrollControls && 'no-scrollbar min-w-0 flex-1 touch-pan-x overscroll-x-contain scroll-smooth',
        className,
      )}
      style={visibleSlots === undefined ? undefined : {
        width: viewportWidth,
        maxWidth: '100%',
        flex: '0 1 auto',
        gap: 0,
        paddingInline: 0,
        borderBottomWidth: scrollControls ? 0 : undefined,
      }}
      role="tablist"
      aria-label={ariaLabel}
      onScroll={updateScrollState}
    >
      {items.map((item, index) => {
        const isSelected = item.value === value
        return (
          <button
            key={item.value}
            ref={(element) => { tabRefs.current[index] = element }}
            type="button"
            role="tab"
            aria-label={item.accessibleLabel}
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => { onChange(item.value) }}
            onKeyDown={(event) => { handleKeyDown(event, index) }}
            title={typeof item.label === 'string' ? item.label : undefined}
            style={visibleSlots === undefined ? undefined : { width: 'var(--tab-slot-width, 10rem)', maxWidth: 'none' }}
            className={`max-w-64 shrink-0 overflow-hidden whitespace-nowrap border-b-2 text-ellipsis font-medium transition ${compact ? 'px-3 py-2.5 text-xs' : 'px-4 py-3.5 text-sm'} ${
              isSelected
                ? indicator === 'inset'
                  ? 'relative border-transparent text-accent after:absolute after:inset-x-4 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-accent after:content-[\'\']'
                  : 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )

  if (!scrollControls) return tabList

  const scroll = (direction: -1 | 1) => {
    const element = tabListRef.current
    if (!element) return

    const measuredWidth = tabRefs.current[0]?.offsetWidth ?? 0
    const slotWidth = measuredWidth > 0 ? measuredWidth : element.clientWidth
    const pageWidth = visibleSlots === undefined
      ? Math.max(160, element.clientWidth * 0.8)
      : Math.max(1, Math.floor(element.clientWidth / slotWidth)) * slotWidth
    element.scrollBy({
      left: direction * pageWidth,
      behavior: 'smooth',
    })
  }

  return (
    <div ref={wrapperRef} className={cn('flex min-w-0 items-stretch', appearance === 'default' && 'border-b border-border bg-surface')}
      style={visibleSlots === undefined ? undefined : {
        width: isOverflowing ? `calc(${viewportWidth ?? '0px'} + 2 * var(--tab-control-width, 2.25rem))` : viewportWidth,
        maxWidth: '100%',
      }}>
      {isOverflowing ? (
        <button
          type="button"
          aria-label={scrollControls.previousLabel}
          disabled={!canScrollPrevious}
          onClick={() => { scroll(-1) }}
          style={visibleSlots === undefined ? undefined : { width: 'var(--tab-control-width, 2.25rem)' }}
          className="flex w-9 shrink-0 items-center justify-center border-r border-border text-text-muted transition hover:bg-surface-muted hover:text-accent disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-text-muted"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
      ) : null}
      {tabList}
      {isOverflowing ? (
        <button
          type="button"
          aria-label={scrollControls.nextLabel}
          disabled={!canScrollNext}
          onClick={() => { scroll(1) }}
          style={visibleSlots === undefined ? undefined : { width: 'var(--tab-control-width, 2.25rem)' }}
          className="flex w-9 shrink-0 items-center justify-center border-l border-border text-text-muted transition hover:bg-surface-muted hover:text-accent disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-text-muted"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      ) : null}
    </div>
  )
}
