import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/utils/cn'

interface MultiSelectDropdownProps {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  id?: string
  className?: string
}

export function MultiSelectDropdown({ options, selected, onChange, id, className }: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const toggleOption = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option]
    onChange(newSelected)
  }

  const removeChip = (option: string) => {
    onChange(selected.filter((item) => item !== option))
  }

  return (
    <div ref={containerRef} className={cn('relative min-w-0 max-w-full', className)}>
      <div
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex flex-wrap gap-1.5 rounded-xl border px-3 py-2 min-h-10 w-full transition cursor-pointer',
          'bg-[#fcfdff] border-[#cfdaea] text-[#273750] shadow-sm',
          'hover:border-[#0d91d7]',
          isOpen && 'border-[#0d91d7] bg-white ring-4 ring-[#1596dd]/10',
          selected.length === 0 && 'text-[#9aa8bc]',
        )}
      >
        {selected.length === 0 ? (
          <span className="text-sm">Select tags...</span>
        ) : (
          selected.map((tag) => (
            <div
              key={tag}
              className="inline-flex items-center gap-1.5 rounded px-2 py-1 bg-[#e3f1fa] text-xs font-medium text-[#0d91d7]"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeChip(tag)
                }}
                className="font-semibold transition hover:opacity-70 leading-none"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#fcfdff] border border-[#cfdaea] rounded-xl shadow-lg max-h-60 overflow-y-auto z-50">
          {options.map((option) => (
            <div
              key={option}
              onClick={() => toggleOption(option)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition text-sm',
                'hover:bg-[#f9fbfd]',
                selected.includes(option) && 'bg-[#e3f1fa]',
              )}
            >
              <div
                className={cn(
                  'flex-shrink-0 w-4 h-4 rounded border border-[#cfdaea] flex items-center justify-center transition',
                  selected.includes(option) && 'bg-[#0d91d7] border-[#0d91d7]',
                )}
              >
                {selected.includes(option) && (
                  <span className="text-white text-xs font-bold">✓</span>
                )}
              </div>
              <span className="text-[#273750]">{option}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
