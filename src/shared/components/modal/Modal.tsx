import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children?: ReactNode
  footer?: ReactNode
  ariaLabel?: string
}

// Generic centered dialog shell. Renders nothing until `open`, so the content
// is absent from the DOM (not merely hidden) when closed. Backdrop click and
// Escape both close it.
export function Modal({ open, onClose, title, children, footer, ariaLabel }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-lg"
        onClick={(event) => { event.stopPropagation() }}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : ariaLabel}
      >
        <div className="border-b border-[#e3edf6] px-6 py-4">
          <h2 className="text-base font-semibold text-[#17233d]">{title}</h2>
        </div>
        {children}
        {footer ? <div className="flex gap-3 border-t border-[#e3edf6] px-6 py-4">{footer}</div> : null}
      </div>
    </>
  )
}
