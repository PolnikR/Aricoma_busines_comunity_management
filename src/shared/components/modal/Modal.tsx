import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  ariaLabel?: string
  className?: string
  size?: 'md' | 'lg'
  contentOverflow?: 'auto' | 'responsive'
  closeOnBackdrop?: boolean
}

// Generic centered dialog shell. Renders nothing until `open`, so the content
// is absent from the DOM (not merely hidden) when closed. Backdrop click and
// Escape both close it.
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  ariaLabel,
  className,
  size = 'md',
  contentOverflow = 'auto',
  closeOnBackdrop = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const getFocusable = () => [...(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])].filter((element) => !element.hasAttribute('hidden'))
    const firstFocusable = getFocusable()[0]
    if (firstFocusable) firstFocusable.focus()
    else dialogRef.current?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = getFocusable()
      if (focusable.length === 0) {
        event.preventDefault()
        dialogRef.current?.focus()
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

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-h-[90vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface shadow-lg flex flex-col',
          size === 'lg' ? 'max-w-2xl' : 'max-w-md',
          className,
        )}
        onClick={(event) => { event.stopPropagation() }}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : ariaLabel}
      >
        {title ? (
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          </div>
        ) : null}
        <div className={cn(
          'flex-1 min-h-0',
          contentOverflow === 'responsive' ? 'overflow-y-auto md:overflow-visible' : 'overflow-y-auto',
        )}>
          {children}
        </div>
        {footer ? <div className="flex gap-3 border-t border-border px-6 py-4">{footer}</div> : null}
      </div>
    </>
  )
}
