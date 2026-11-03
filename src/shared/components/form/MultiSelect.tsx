import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const panel = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState({ top: 0, left: 0, width: 0, maxHeight: 192 })
  const expanded = open && !disabled

  useLayoutEffect(() => {
    if (!expanded) return
    const place = () => {
      const anchor = root.current?.querySelector('button')?.getBoundingClientRect()
      const menu = panel.current
      if (!anchor || !menu) return
      const width = Math.min(anchor.width, document.documentElement.clientWidth - 16)
      // Measure wrapping at the final width, including the panel's two borders.
      menu.style.width = `${String(Math.max(0, width))}px`
      const below = window.innerHeight - anchor.bottom - 12
      const above = anchor.top - 12
      const height = Math.min(192, menu.scrollHeight + 2)
      const upward = below < height && above > below
      const maxHeight = Math.max(0, Math.min(192, upward ? above : below))
      setPlacement({
        top: upward ? Math.max(8, anchor.top - 4 - Math.min(height, maxHeight)) : anchor.bottom + 4,
        left: Math.max(8, Math.min(anchor.left, document.documentElement.clientWidth - width - 8)),
        width: Math.max(0, width), maxHeight,
      })
    }
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return
      place()
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [expanded, options.length])

  useEffect(() => {
    if (!expanded) return
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target) && !panel.current?.contains(event.target)) setOpen(false)
    }
    // Bridge the portaled checkboxes into the form's tab order before its modal trap.
    const onKey = (event: KeyboardEvent) => {
      const trigger = root.current?.querySelector('button')
      const menu = panel.current
      if (!trigger || !menu) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
        trigger.focus()
        return
      }
      if (event.key !== 'Tab') return
      const active = document.activeElement
      const choices = [...menu.querySelectorAll<HTMLInputElement>('input:not([disabled])')]
      let target: HTMLElement | undefined
      if (active === trigger && !event.shiftKey) target = choices[0]
      else if (active instanceof Node && menu.contains(active)) {
        const index = choices.findIndex(choice => choice === active)
        target = choices[index + (event.shiftKey ? -1 : 1)]
        if (!target && event.shiftKey) target = trigger
        if (!target) {
          const scope = trigger.closest('[role="dialog"][aria-modal="true"]') ?? document.body
          const controls = [...scope.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(control => !menu.contains(control) && !control.hasAttribute('hidden'))
          target = controls[controls.indexOf(trigger) + 1] ?? controls[0]
        }
      }
      if (!target) return
      event.preventDefault()
      event.stopPropagation()
      target.focus()
    }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [expanded])

  const summary = value.map(item => options.find(option => option.value === item)?.label ?? item).join(', ')

  return (
    <div ref={root} className="min-w-0" aria-owns={expanded ? panelId : undefined} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget) && !panel.current?.contains(event.relatedTarget)) setOpen(false)
    }}>
      <Button id={id} variant="outline" fullWidth disabled={disabled}
        aria-label={label} aria-expanded={expanded} aria-controls={panelId}
        className="justify-between disabled:opacity-100 disabled:bg-surface-muted disabled:text-text-muted disabled:border-border-strong disabled:hover:bg-surface-muted disabled:hover:text-text-muted disabled:hover:border-border-strong" onClick={() => { setOpen(current => !current) }}>
        <span className="min-w-0 truncate" title={summary || placeholder}>{summary || placeholder}</span>
        <span aria-hidden="true" className="shrink-0">▾</span>
      </Button>
      {expanded ? createPortal(
        <div ref={panel} id={panelId} role="group" aria-label={label} style={placement}
          className="custom-scrollbar fixed z-[60] overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-sm">
          {options.length === 0 ? <p className="p-2 text-sm text-text-muted">{emptyText}</p> : options.map(option => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm text-text-secondary hover:bg-surface-muted">
              <input type="checkbox" checked={value.includes(option.value)}
                className="size-4 shrink-0 accent-accent"
                onChange={event => { onChange(event.target.checked ? [...value, option.value] : value.filter(item => item !== option.value)) }} />
              <span className="min-w-0 break-words">{option.label}</span>
            </label>
          ))}
        </div>, document.body,
      ) : null}
    </div>
  )
}
