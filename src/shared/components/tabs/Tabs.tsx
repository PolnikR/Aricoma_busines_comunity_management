import { useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
}

interface TabsProps<T extends string> {
  items: readonly TabItem<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: TabsProps<T>) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

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

  return (
    <div
      className={cn('flex gap-1 overflow-x-auto border-b border-[#e3edf6] px-3', className)}
      role="tablist"
      aria-label={ariaLabel}
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
            className={`whitespace-nowrap border-b-2 px-4 py-3.5 text-sm font-medium transition ${
              isSelected
                ? 'border-[#0d91d7] text-[#0d91d7]'
                : 'border-transparent text-[#71819a] hover:text-[#17233d]'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
