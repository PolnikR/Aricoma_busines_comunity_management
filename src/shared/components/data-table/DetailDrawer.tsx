import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useResizablePanel } from '@/shared/hooks/useResizablePanel'
import { cn } from '@/shared/utils/cn'

interface DetailDrawerProps {
  open: boolean
  onClose: () => void
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  headerExtra?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  resizable?: boolean
  ariaLabel?: string
  closeLabel?: string
  bodyClassName?: string
}

// Right-hand slide-over for showing details of a selected row, lifted from the
// Virtual Machines detail panel. Feature supplies the header info and body, and
// optionally a pinned footer. When `resizable` is set the panel can be dragged
// wider/narrower for the current view only — it resets to the default width
// whenever it closes.
export function DetailDrawer({ open, onClose, eyebrow, title, subtitle, headerExtra, children, footer, resizable = false, ariaLabel = 'Detail', closeLabel = 'Close detail', bodyClassName }: DetailDrawerProps) {
  const { width, handleProps } = useResizablePanel({ open })
  const drawerRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = [...(drawerRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [])].filter((element) => !element.hasAttribute('hidden'))
      if (focusable.length === 0) {
        event.preventDefault()
        drawerRef.current?.focus()
        return
      }
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      openerRef.current?.focus()
      openerRef.current = null
    }
  }, [open])

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/45 transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        tabIndex={-1}
        inert={!open}
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex flex-col border-l border-border bg-surface shadow-[-14px_0_40px_-20px_rgba(20,35,70,0.4)] transition-transform duration-200 ease-out ${resizable ? '' : 'w-[min(420px,92vw)]'} ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={resizable ? { width: `${String(width)}px`, maxWidth: '92vw' } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        {resizable ? (
          <div
            {...handleProps}
            className="absolute inset-y-0 left-0 z-10 w-1.5 cursor-col-resize bg-transparent transition hover:bg-accent/30 focus:bg-accent/40 focus:outline-none"
          />
        ) : null}
        <div className="border-b border-border p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {eyebrow ? <p className="text-xs font-medium text-text-subtle">{eyebrow}</p> : null}
              <h2 className="mt-1 truncate text-base font-semibold text-text-primary">{title}</h2>
              {subtitle ? <div className="mt-1 truncate text-xs text-text-muted">{subtitle}</div> : null}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-text-muted transition hover:border-accent hover:text-accent"
            >
              ✕
            </button>
          </div>
          {headerExtra ? <div className="mt-3 w-full">{headerExtra}</div> : null}
        </div>
        <div className={cn('custom-scrollbar flex-1', bodyClassName ?? 'overflow-y-auto')}>{children}</div>
        {footer ? <div className="flex gap-3 border-t border-border p-4">{footer}</div> : null}
      </aside>
    </>
  )
}

interface DetailRowProps {
  label: string
  value: ReactNode
  secondary?: ReactNode
}

// A label/value row for a definition list inside the drawer body.
export function DetailRow({ label, value, secondary }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <dt className="shrink-0 text-xs text-text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-text-primary">
        <div className="wrap-break-word">{value}</div>
        {secondary ? <div className="mt-0.5 wrap-break-word text-xs font-normal text-text-muted">{secondary}</div> : null}
      </dd>
    </div>
  )
}

interface DetailStatProps {
  label: string
  value: ReactNode
  icon?: ReactNode
}

// A compact stat tile (e.g. vCPU / Memory) for the top of the drawer body.
export function DetailStat({ label, value, icon }: DetailStatProps) {
  return (
    <div className="flex items-center gap-2 p-4">
      {icon ? <span className="shrink-0 text-brand-500">{icon}</span> : null}
      <div className="flex items-baseline gap-1">
        <p className="text-lg font-semibold text-text-primary">{value}</p>
        <p className="text-xs text-text-muted">{label}</p>
      </div>
    </div>
  )
}
