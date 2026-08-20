import { useMemo, useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/utils/cn'

interface MultiSelectDropdownProps {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  id?: string
  className?: string
  disabled?: boolean
  placeholder?: string
  ariaLabel?: string
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  id,
  className,
  disabled = false,
  placeholder = 'Select tags...',
  ariaLabel = 'Select tags',
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedValues = [...new Set(selected)]
  const selectedSet = useMemo(() => new Set(selected), [selected])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => { document.removeEventListener('click', handleClickOutside); }
  }, [])

  const toggleOption = (option: string) => {
    if (disabled) return
    const newSelected = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option]
    onChange(newSelected)
  }

  const removeChip = (option: string) => {
    if (disabled) return
    onChange(selected.filter((item) => item !== option))
  }

  return (
    <div ref={containerRef} className={cn('relative min-w-0 max-w-full', className)}>
      <div
        id={id}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
        onKeyDown={(event) => {
          if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            setIsOpen(!isOpen)
          }
        }}
        className={cn(
          'flex flex-wrap gap-1.5 rounded-xl border px-3 py-2 min-h-10 max-h-24 w-full overflow-y-auto transition cursor-pointer',
          'bg-surface-subtle border-border-strong text-text-secondary shadow-sm',
          'hover:border-accent',
          isOpen && 'border-accent bg-surface ring-4 ring-focus/10',
          selectedValues.length === 0 && 'text-text-subtle',
          disabled && 'cursor-not-allowed opacity-60 hover:border-border-strong',
        )}
      >
        {selectedValues.length === 0 ? (
          <span className="text-sm">{placeholder}</span>
        ) : (
          selectedValues.map((tag) => (
            <div
              key={tag}
              className="inline-flex items-center gap-1.5 rounded px-2 py-1 bg-accent-soft text-xs font-medium text-accent"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeChip(tag)
                }}
                aria-label={`Remove ${tag}`}
                disabled={disabled}
                className="font-semibold transition hover:opacity-70 leading-none"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {isOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute top-full left-0 right-0 mt-2 bg-surface-subtle border border-border-strong rounded-xl shadow-lg max-h-60 overflow-y-auto z-50"
        >
          {options.map((option) => {
            const isSelected = selectedSet.has(option)
            return (
              <div
                key={option}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => { toggleOption(option); }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggleOption(option)
                  }
                }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition text-sm',
                  'hover:bg-surface-subtle',
                  isSelected && 'bg-accent-soft',
                )}
              >
                <div
                  className={cn(
                    'shrink-0 w-4 h-4 rounded border border-border-strong flex items-center justify-center transition',
                    isSelected && 'bg-accent border-accent',
                  )}
                >
                  {isSelected && (
                    <span className="text-white text-xs font-bold">✓</span>
                  )}
                </div>
                <span className="text-text-secondary">{option}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
