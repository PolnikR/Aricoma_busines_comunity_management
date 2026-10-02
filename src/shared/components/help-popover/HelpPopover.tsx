import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CloseIcon, HelpIcon } from '@/shared/icons/Icons'

interface HelpPopoverProps {
  triggerLabel: string
  title: string
  closeLabel: string
  children: ReactNode
}

const VIEWPORT_GAP = 8

// A "?" icon button that opens a small explanation panel on click (never on hover).
//
// The panel is a non-modal `dialog` labelled by its title: it is opened on purpose,
// stays until dismissed and holds a close button, so it is not a `tooltip` (which
// must be hover/focus triggered and hold no interactive content).
//
// It renders in place, absolutely positioned under the trigger, instead of in a
// portal. Inside a DetailDrawer that keeps it within the drawer's aria-modal
// subtree and its focus trap; the drawer sets no overflow, so nothing clips it.
// After opening, the panel is nudged horizontally to stay inside the viewport and
// its height is capped to the space below the trigger.
//
// Escape closes only the panel: the key event is stopped so an enclosing drawer
// does not close too. Escape, the close button and a second trigger click return
// focus to the trigger; a click outside closes it and leaves focus where it lands.
export function HelpPopover({ triggerLabel, title, closeLabel, children }: HelpPopoverProps) {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState({ shift: 0, maxHeight: 0 })
  const rootRef = useRef<HTMLSpanElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const titleId = useId()

  const close = (returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const panel = panelRef.current
      if (!panel) return
      // Measure without the current shift so the correction does not accumulate.
      const appliedTranslate = panel.style.translate
      panel.style.translate = '0px'
      const rect = panel.getBoundingClientRect()
      panel.style.translate = appliedTranslate
      let shift = 0
      if (rect.left < VIEWPORT_GAP) shift = VIEWPORT_GAP - rect.left
      else if (rect.right > window.innerWidth - VIEWPORT_GAP) shift = window.innerWidth - VIEWPORT_GAP - rect.right
      setPlacement({ shift, maxHeight: Math.max(160, window.innerHeight - rect.top - VIEWPORT_GAP) })
    }
    place()
    window.addEventListener('resize', place)
    return () => { window.removeEventListener('resize', place) }
  }, [open])

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => { document.removeEventListener('pointerdown', onPointerDown) }
  }, [open])

  return (
    <span
      ref={rootRef}
      className="relative inline-flex shrink-0"
      onKeyDown={(event) => {
        if (!open || event.key !== 'Escape') return
        event.preventDefault()
        event.stopPropagation()
        close(true)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => { if (open) close(true); else setOpen(true) }}
        className="flex size-8 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15 aria-expanded:bg-accent-soft aria-expanded:text-accent"
      >
        <HelpIcon className="size-4" />
      </button>
      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-labelledby={titleId}
          tabIndex={-1}
          style={{ translate: `${String(placement.shift)}px 0`, maxHeight: placement.maxHeight || undefined }}
          className="custom-scrollbar absolute top-full right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border-strong bg-surface p-4 text-left shadow-[0_18px_40px_-16px_rgba(20,35,70,0.45)] focus-visible:outline-none"
        >
          <div className="flex items-start gap-2">
            <HelpIcon className="mt-0.5 size-4 shrink-0 text-accent" />
            <h3 id={titleId} className="min-w-0 flex-1 text-sm font-semibold text-text-primary">{title}</h3>
            <button
              type="button"
              aria-label={closeLabel}
              onClick={() => { close(true) }}
              className="-mt-1 -mr-1 flex size-6 shrink-0 items-center justify-center rounded-md text-text-muted transition hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15"
            >
              <CloseIcon className="size-3.5" />
            </button>
          </div>
          <div className="mt-2 space-y-3 text-xs leading-5 text-text-secondary">{children}</div>
        </div>
      ) : null}
    </span>
  )
}
