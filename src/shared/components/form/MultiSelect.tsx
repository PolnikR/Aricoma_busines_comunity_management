import { useId, useRef, useState } from 'react'
import { Button } from '@/shared/components/button/Button'

interface MultiSelectProps {
  id: string
  label: string
  options: { value: string; label: string }[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
  emptyText: string
  disabled?: boolean
}

export function MultiSelect({ id, label, options, value, onChange, placeholder, emptyText, disabled = false }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const root = useRef<HTMLDivElement>(null)
  const summary = value.map(item => options.find(option => option.value === item)?.label ?? item).join(', ')

  return (
    <div ref={root} className="min-w-0" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }} onKeyDown={event => {
      if (event.key === 'Escape' && open) {
        event.stopPropagation()
        setOpen(false)
        root.current?.querySelector('button')?.focus()
      }
    }}>
      <Button id={id} variant="outline" fullWidth disabled={disabled}
        aria-label={label} aria-expanded={open && !disabled} aria-controls={panelId}
        className="justify-between" onClick={() => { setOpen(current => !current) }}>
        <span className="min-w-0 truncate" title={summary || placeholder}>{summary || placeholder}</span>
        <span aria-hidden="true" className="shrink-0">▾</span>
      </Button>
      {open && !disabled ? (
        <div id={panelId} role="group" aria-label={label}
          className="custom-scrollbar mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-sm">
          {options.length === 0 ? <p className="p-2 text-sm text-text-muted">{emptyText}</p> : options.map(option => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm text-text-secondary hover:bg-surface-muted">
              <input type="checkbox" checked={value.includes(option.value)}
                className="size-4 shrink-0 accent-accent"
                onChange={event => { onChange(event.target.checked ? [...value, option.value] : value.filter(item => item !== option.value)) }} />
              <span className="min-w-0 break-words">{option.label}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  )
}
