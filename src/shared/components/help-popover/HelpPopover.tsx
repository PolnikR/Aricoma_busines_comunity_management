import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { CloseIcon, HelpIcon } from '@/shared/icons/Icons'

interface HelpPopoverProps {
  triggerLabel: string
  title: string
  closeLabel: string
  // `wide` fits content such as tables or relationship rows; the default stays compact.
  width?: 'default' | 'wide'
  children: ReactNode
}

const VIEWPORT_GAP = 8
const HOVER_OPEN_DELAY_MS = 150
const HOVER_CLOSE_DELAY_MS = 200

const PANEL_WIDTH = {
  default: 'w-[min(22rem,calc(100vw-2rem))]',
  wide: 'w-[min(55rem,calc(100vw-2rem))]',
} as const

// A "?" icon button that opens an explanation panel on pointer hover or keyboard
// focus; a click or tap also opens it, as the fallback for touch devices.
//
// The panel stays open while the pointer is over the trigger or the panel (a short
// grace delay bridges the gap between them) or while focus is inside either; it
// closes once both pointer and focus have left. Opening never moves focus: Tab from
// the trigger enters the focusable panel, so keyboard users can scroll it.
//
// The panel is a non-modal `dialog` labelled by its title, because it holds a
// close button and may hold more than a tooltip-sized text.
//
// It renders in place, absolutely positioned under the trigger, instead of in a
// portal. Inside a DetailDrawer that keeps it within the drawer's aria-modal
// subtree and its focus trap; the drawer sets no overflow, so nothing clips it.
// After opening, the panel is nudged horizontally to stay inside the viewport and
// its height is capped to the space below the trigger.
//
// Escape closes only the panel: while open it listens in the window capture phase
// and stops the key, so an enclosing drawer's window listener never sees it, also
// when the panel was opened by hover and focus is elsewhere. After Escape or the
// close button the panel does not reopen from focus already on the trigger; focus
// has to leave and return, or the pointer has to re-enter. A pointer down outside
// closes it and leaves focus where it lands.
export function HelpPopover({ triggerLabel, title, closeLabel, width = 'default', children }: HelpPopoverProps) {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState({ shift: 0, maxHeight: 0 })
  const rootRef = useRef<HTMLSpanElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pointerInside = useRef(false)
  const focusInside = useRef(false)
  // Set by an explicit dismissal so focus returning to the trigger does not reopen.
  const dismissed = useRef(false)
  const openTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const panelId = useId()
  const titleId = useId()

  const clearTimers = () => {
    clearTimeout(openTimer.current)
    clearTimeout(closeTimer.current)
  }

  const dismiss = (returnFocus: boolean) => {
    clearTimers()
    dismissed.current = true
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  useEffect(() => clearTimers, [])

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
    const closeNow = () => {
      clearTimeout(openTimer.current)
      clearTimeout(closeTimer.current)
      setOpen(false)
    }
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return
      closeNow()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      const active = document.activeElement
      const focusInPanel = active instanceof Node && Boolean(panelRef.current?.contains(active))
      closeNow()
      // Focus on the trigger or in the panel would otherwise reopen it immediately.
      if (active === triggerRef.current || focusInPanel) dismissed.current = true
      if (focusInPanel) triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  const onPointerEnter = (event: ReactPointerEvent) => {
    if (event.pointerType === 'touch') return
    pointerInside.current = true
    dismissed.current = false
    clearTimeout(closeTimer.current)
    if (!open) openTimer.current = setTimeout(() => { setOpen(true) }, HOVER_OPEN_DELAY_MS)
  }

  const onPointerLeave = (event: ReactPointerEvent) => {
    if (event.pointerType === 'touch') return
    pointerInside.current = false
    clearTimeout(openTimer.current)
    if (!focusInside.current) closeTimer.current = setTimeout(() => { setOpen(false) }, HOVER_CLOSE_DELAY_MS)
  }

  return (
    <span
      ref={rootRef}
      className="relative inline-flex shrink-0"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={() => {
        focusInside.current = true
        clearTimeout(closeTimer.current)
        if (!dismissed.current) setOpen(true)
      }}
      onBlur={(event) => {
        if (event.relatedTarget instanceof Node && rootRef.current?.contains(event.relatedTarget)) return
        focusInside.current = false
        dismissed.current = false
        if (!pointerInside.current) {
          clearTimers()
          setOpen(false)
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          dismissed.current = false
          setOpen(true)
        }}
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
          tabIndex={0}
          style={{ translate: `${String(placement.shift)}px 0`, maxHeight: placement.maxHeight || undefined }}
          className={`custom-scrollbar absolute top-full right-0 z-20 mt-2 ${PANEL_WIDTH[width]} overflow-y-auto rounded-xl border border-border-strong bg-surface p-4 text-left shadow-[0_18px_40px_-16px_rgba(20,35,70,0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15`}
        >
          <div className="flex items-start gap-2">
            <HelpIcon className="mt-0.5 size-4 shrink-0 text-accent" />
            <h3 id={titleId} className="min-w-0 flex-1 text-sm font-semibold text-text-primary">{title}</h3>
            <button
              type="button"
              aria-label={closeLabel}
              onClick={() => { dismiss(true) }}
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
