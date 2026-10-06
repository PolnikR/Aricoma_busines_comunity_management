import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
// Space between the trigger and the panel.
const PANEL_OFFSET = 8
// Smallest useful panel height before it scrolls.
const MIN_PANEL_HEIGHT = 120
const HOVER_OPEN_DELAY_MS = 150
const HOVER_CLOSE_DELAY_MS = 200

// Nominal widths, capped by `max-w-[calc(100%-2rem)]` on the panel: for a fixed panel the
// percentage resolves against the usable viewport (without a classic page scrollbar), not `100vw`.
const PANEL_WIDTH = {
  default: 'w-[22rem]',
  wide: 'w-[55rem]',
} as const

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableIn(container: ParentNode) {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(element => !element.hasAttribute('hidden') && element.tabIndex >= 0)
}

interface Placement {
  top: number
  left: number
  maxHeight: number
  placed: boolean
}

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
// The panel renders in a portal on document.body with fixed positioning, so a
// dialog's overflow (DetailView, Modal body) never clips it. It is anchored to the
// trigger: below it by default, above it when there is not enough room below and more
// above; its right edge follows the trigger and it is clamped inside the usable viewport
// (without a classic page scrollbar). It follows the trigger on resize and on any scroll.
//
// Being outside the owning dialog in the DOM, it keeps the dialog relationship
// explicitly: aria-owns puts it in the dialog's accessibility tree, and Tab is bridged
// in the window capture phase (trigger → panel → the control after the trigger, and
// Shift+Tab back to the trigger), stopped there so the dialog's focus trap never takes it.
//
// Escape closes only the panel: while open it listens in the window capture phase
// and stops the key, so an enclosing dialog's window listener never sees it, also
// when the panel was opened by hover and focus is elsewhere. After Escape or the
// close button the panel does not reopen from focus already on the trigger; focus
// has to leave and return, or the pointer has to re-enter. A pointer down outside
// closes it and leaves focus where it lands.
export function HelpPopover({ triggerLabel, title, closeLabel, width = 'default', children }: HelpPopoverProps) {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<Placement>({ top: 0, left: 0, maxHeight: 0, placed: false })
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
      const trigger = triggerRef.current
      if (!panel || !trigger) return
      const anchor = trigger.getBoundingClientRect()
      // Measure the natural height without the current cap.
      const appliedMaxHeight = panel.style.maxHeight
      panel.style.maxHeight = 'none'
      const { width, height } = panel.getBoundingClientRect()
      panel.style.maxHeight = appliedMaxHeight
      const below = window.innerHeight - anchor.bottom - PANEL_OFFSET - VIEWPORT_GAP
      const above = anchor.top - PANEL_OFFSET - VIEWPORT_GAP
      const placeAbove = height > below && above > below
      const maxHeight = Math.max(MIN_PANEL_HEIGHT, placeAbove ? above : below)
      const top = placeAbove
        ? Math.max(VIEWPORT_GAP, anchor.top - PANEL_OFFSET - Math.min(height, maxHeight))
        : anchor.bottom + PANEL_OFFSET
      // clientWidth, not innerWidth: the right boundary must exclude a classic page scrollbar.
      const viewportWidth = document.documentElement.clientWidth
      const left = Math.min(Math.max(VIEWPORT_GAP, anchor.right - width), viewportWidth - VIEWPORT_GAP - width)
      setPlacement({ top, left: Math.max(VIEWPORT_GAP, left), maxHeight, placed: true })
    }
    place()
    window.addEventListener('resize', place)
    // Capture: scrolling any container (e.g. a DetailView section) moves the trigger.
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const closeNow = () => {
      clearTimeout(openTimer.current)
      clearTimeout(closeTimer.current)
      setOpen(false)
    }
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && (rootRef.current?.contains(event.target) || panelRef.current?.contains(event.target))) return
      closeNow()
    }
    // The portaled panel is not next to the trigger in the DOM, so Tab is routed here:
    // trigger → panel → … → the control after the trigger in its dialog (or page).
    const onTab = (event: KeyboardEvent) => {
      const panel = panelRef.current
      const trigger = triggerRef.current
      const active = document.activeElement
      if (!panel || !trigger || !(active instanceof HTMLElement)) return
      let target: HTMLElement | undefined
      if (active === trigger) {
        if (event.shiftKey) return
        target = panel
      } else if (panel.contains(active)) {
        const inPanel = [panel, ...focusableIn(panel)]
        const index = inPanel.indexOf(active)
        if (event.shiftKey) target = index > 0 ? inPanel[index - 1] : trigger
        else if (index >= 0 && index < inPanel.length - 1) target = inPanel[index + 1]
        else {
          const scope = trigger.closest<HTMLElement>('[role="dialog"][aria-modal="true"]') ?? document.body
          const order = focusableIn(scope)
          target = order[order.indexOf(trigger) + 1] ?? order[0]
        }
      } else return
      event.preventDefault()
      event.stopPropagation()
      target?.focus()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') { onTab(event); return }
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
      // Keeps the portaled panel in this element's (and its dialog's) accessibility tree.
      aria-owns={open ? panelId : undefined}
      className="relative inline-flex shrink-0"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={() => {
        focusInside.current = true
        clearTimeout(closeTimer.current)
        if (!dismissed.current) setOpen(true)
      }}
      onBlur={(event) => {
        const next = event.relatedTarget
        if (next instanceof Node && (rootRef.current?.contains(next) || panelRef.current?.contains(next))) return
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
      {open ? createPortal(
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-labelledby={titleId}
          tabIndex={0}
          style={{
            top: placement.top,
            left: placement.left,
            maxHeight: placement.maxHeight || undefined,
            visibility: placement.placed ? undefined : 'hidden',
          }}
          className={`custom-scrollbar fixed z-[60] ${PANEL_WIDTH[width]} max-w-[calc(100%-2rem)] overflow-y-auto rounded-xl border border-border-strong bg-surface p-4 text-left shadow-[0_18px_40px_-16px_rgba(20,35,70,0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15`}
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
        </div>,
        document.body,
      ) : null}
    </span>
  )
}
