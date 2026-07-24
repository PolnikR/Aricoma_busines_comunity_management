import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useResizablePanel } from '@/shared/hooks/useResizablePanel'

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
}

// Right-hand slide-over for showing details of a selected row, lifted from the
// Virtual Machines detail panel. Feature supplies the header info and body, and
// optionally a pinned footer. When `resizable` is set the panel can be dragged
// wider/narrower for the current view only — it resets to the default width
// whenever it closes.
export function DetailDrawer({ open, onClose, eyebrow, title, subtitle, headerExtra, children, footer, resizable = false, ariaLabel = 'Detail' }: DetailDrawerProps) {
  const { width, handleProps } = useResizablePanel({ open })

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[#0f1932]/30 transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex flex-col border-l border-[#d7deea] bg-white shadow-[-14px_0_40px_-20px_rgba(20,35,70,0.4)] transition-transform duration-200 ease-out ${resizable ? '' : 'w-[min(420px,92vw)]'} ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={resizable ? { width: `${String(width)}px`, maxWidth: '92vw' } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        {resizable ? (
          <div
            {...handleProps}
            className="absolute inset-y-0 left-0 z-10 w-1.5 cursor-col-resize bg-transparent transition hover:bg-[#0d91d7]/30 focus:bg-[#0d91d7]/40 focus:outline-none"
          />
        ) : null}
        <div className="flex items-start justify-between gap-4 border-b border-[#dfe9f3] p-5">
          <div className="min-w-0">
            {eyebrow ? <p className="text-xs font-medium text-gray-400">{eyebrow}</p> : null}
            <h2 className="mt-1 truncate text-base font-semibold text-gray-900">{title}</h2>
            {subtitle ? <div className="mt-1 truncate text-xs text-gray-500">{subtitle}</div> : null}
            {headerExtra ? <div className="mt-3 flex flex-wrap gap-2">{headerExtra}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#d7deea] text-gray-500 transition hover:border-[#0d91d7] hover:text-[#118ccc]"
          >
            ✕
          </button>
        </div>
        <div className="custom-scrollbar flex-1 overflow-y-auto">{children}</div>
        {footer ? <div className="flex gap-3 border-t border-[#dfe9f3] p-4">{footer}</div> : null}
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
    <div className="flex items-start justify-between gap-4 border-b border-[#edf2f7] py-3 last:border-b-0">
      <dt className="shrink-0 text-xs text-gray-500">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-gray-800">
        <div className="wrap-break-word">{value}</div>
        {secondary ? <div className="mt-0.5 wrap-break-word text-xs font-normal text-gray-500">{secondary}</div> : null}
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
        <p className="text-lg font-semibold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}
