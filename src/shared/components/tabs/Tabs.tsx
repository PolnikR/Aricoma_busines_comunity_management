import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'
import { ChevronLeftIcon, ChevronRightIcon } from '@/shared/icons/Icons'

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
}

interface TabsProps<T extends string> {
  items: readonly TabItem<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  indicator?: 'edge' | 'inset'
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
  className,
  scrollControls,
}: TabsProps<T>) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const tabListRef = useRef<HTMLDivElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [canScrollPrevious, setCanScrollPrevious] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const updateScrollState = useCallback(() => {
    const tabList = tabListRef.current
    if (!tabList || !scrollControls) return

    const maxScrollLeft = Math.max(0, tabList.scrollWidth - tabList.clientWidth)
    setIsOverflowing(maxScrollLeft > 1)
    setCanScrollPrevious(tabList.scrollLeft > 1)
    setCanScrollNext(tabList.scrollLeft < maxScrollLeft - 1)
  }, [scrollControls])

  useEffect(() => {
    if (!scrollControls) return

    const tabList = tabListRef.current
    if (!tabList) return

    updateScrollState()
    window.addEventListener('resize', updateScrollState)
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateScrollState)
    resizeObserver?.observe(tabList)

    return () => {
      window.removeEventListener('resize', updateScrollState)
      resizeObserver?.disconnect()
    }
  }, [items.length, scrollControls, updateScrollState])

  useEffect(() => {
    if (!scrollControls) return

    const selectedIndex = items.findIndex(item => item.value === value)
    const selectedTab = tabRefs.current[selectedIndex]
    const scrollableTab = selectedTab as Omit<HTMLButtonElement, 'scrollIntoView'> & {
      scrollIntoView?: (options?: ScrollIntoViewOptions) => void
    } | null
    scrollableTab?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    updateScrollState()
  }, [items, scrollControls, updateScrollState, value])

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
        'flex gap-1 overflow-x-auto border-b border-border px-3',
        scrollControls && 'no-scrollbar min-w-0 flex-1 touch-pan-x overscroll-x-contain scroll-smooth',
        className,
      )}
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
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => { onChange(item.value) }}
            onKeyDown={(event) => { handleKeyDown(event, index) }}
            title={typeof item.label === 'string' ? item.label : undefined}
            className={`max-w-64 shrink-0 overflow-hidden whitespace-nowrap border-b-2 px-4 py-3.5 text-ellipsis text-sm font-medium transition ${
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

    element.scrollBy({
      left: direction * Math.max(160, element.clientWidth * 0.8),
      behavior: 'smooth',
    })
  }

  return (
    <div className="flex min-w-0 items-stretch border-b border-border bg-surface">
      {isOverflowing ? (
        <button
          type="button"
          aria-label={scrollControls.previousLabel}
          disabled={!canScrollPrevious}
          onClick={() => { scroll(-1) }}
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
          className="flex w-9 shrink-0 items-center justify-center border-l border-border text-text-muted transition hover:bg-surface-muted hover:text-accent disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-text-muted"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      ) : null}
    </div>
  )
}
