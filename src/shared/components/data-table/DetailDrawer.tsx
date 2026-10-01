import { Fragment, useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useResizablePanel } from '@/shared/hooks/useResizablePanel'
import { CloseIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'

interface DetailDrawerProps {
  open: boolean
  onClose: () => void
  // Transitional (detail-drawer-model-c): removed in Task 18.
  eyebrow?: string
  title: ReactNode
  // One line under the meta row, e.g. a mono ID.
  subtitle?: ReactNode
  // Meta row under the title: object type, status badges, short facts. Falsy items are skipped.
  meta?: readonly ReactNode[]
  // Small actions in the title row, before the close button.
  headerActions?: ReactNode
  // Transitional (detail-drawer-model-c): removed in Task 18.
  headerExtra?: ReactNode
  children?: ReactNode
  // Right-hand (primary) footer group. It always takes the remaining width, so legacy
  // `flex-1` buttons still split the full footer when no `footerStart` is given.
  footer?: ReactNode
  // Left-hand footer group, typically the destructive action.
  footerStart?: ReactNode
  // The width is only user-resizable from `lg`; below it the drawer keeps the fixed width.
  resizable?: boolean
  ariaLabel?: string
  closeLabel?: string
  resizeLabel?: string
  bodyClassName?: string
}

// Elements hidden by CSS (the resize handle below `lg`) are not tabbable, so the
// focus trap must skip them too. jsdom has no checkVisibility and keeps them.
function isVisible(element: HTMLElement) {
  return typeof element.checkVisibility !== 'function' || element.checkVisibility()
}

// Right-hand slide-over for showing details of a selected row, lifted from the
// Virtual Machines detail panel. Feature supplies the header info and body, and
// optionally a pinned footer. When `resizable` is set the panel can be dragged
// wider/narrower from `lg` up for the current view only — it resets to the
// default width whenever it closes. The width goes through a CSS variable so
// below `lg` the fixed width wins and the hidden handle reports nothing.
export function DetailDrawer({ open, onClose, eyebrow, title, subtitle, meta = [], headerActions, headerExtra, children, footer, footerStart, resizable = false, ariaLabel = 'Detail', closeLabel = 'Close detail', resizeLabel = 'Resize panel', bodyClassName }: DetailDrawerProps) {
  const { width, handleProps } = useResizablePanel({ open, resizeLabel })
  const metaItems = [eyebrow, ...meta].filter(Boolean)
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
      // tabIndex < 0 drops roving-tabindex items (e.g. inactive tabs) that Tab never reaches,
      // so `first` / `last` are the real ends of the tab order.
      ) ?? [])].filter((element) => !element.hasAttribute('hidden') && element.tabIndex >= 0 && isVisible(element))
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
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-[min(420px,92vw)] flex-col border-l border-border bg-surface shadow-[-14px_0_40px_-20px_rgba(20,35,70,0.4)] transition-transform duration-200 ease-out',
          resizable ? 'lg:w-(--detail-drawer-width) lg:max-w-[92vw]' : undefined,
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        style={resizable ? { '--detail-drawer-width': `${String(width)}px` } as CSSProperties : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        {resizable ? (
          <div
            {...handleProps}
            className="absolute inset-y-0 left-0 z-10 hidden w-1.5 cursor-col-resize bg-transparent transition hover:bg-accent/30 focus:bg-accent/40 focus:outline-none lg:block"
          />
        ) : null}
        <div className="border-b border-border px-5 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="min-w-0 flex-1 truncate text-base font-semibold leading-8 text-text-primary">{title}</h2>
            {headerActions ? <div className="flex shrink-0 items-center gap-1">{headerActions}</div> : null}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>
          {metaItems.length > 0 ? (
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-text-muted">
              {metaItems.map((item, index) => (
                // Meta items are positional and rendered in the given order, so the index is their identity.
                <Fragment key={index}>
                  {index > 0 ? <span aria-hidden="true" className="size-0.75 shrink-0 rounded-full bg-text-subtle" /> : null}
                  <span className="min-w-0 truncate">{item}</span>
                </Fragment>
              ))}
            </div>
          ) : null}
          {subtitle ? <div className="mt-0.5 truncate text-xs text-text-muted">{subtitle}</div> : null}
          {headerExtra ? <div className="mt-3 w-full">{headerExtra}</div> : null}
        </div>
        <div className={cn('custom-scrollbar flex-1', bodyClassName ?? 'overflow-y-auto')}>{children}</div>
        {footer || footerStart ? (
          <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-5 py-3">
            {footerStart ? <div className="flex flex-wrap items-center gap-3">{footerStart}</div> : null}
            {footer ? <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3">{footer}</div> : null}
          </div>
        ) : null}
      </aside>
    </>
  )
}

interface DetailRowProps {
  label: string
  value: ReactNode
  secondary?: ReactNode
}

// A label/value row for a definition list inside the drawer body. The label
// column is fixed-ish and the value column wraps long text and IDs, with no
// separator lines; drawer sections provide the grouping borders.
export function DetailRow({ label, value, secondary }: DetailRowProps) {
  return (
    <div className="grid grid-cols-[minmax(7rem,35%)_minmax(0,1fr)] items-start gap-x-4 py-2">
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd className="min-w-0 text-sm font-medium text-text-primary wrap-anywhere">
        <div>{value}</div>
        {secondary ? <div className="mt-0.5 text-xs font-normal text-text-muted">{secondary}</div> : null}
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
