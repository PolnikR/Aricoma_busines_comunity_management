import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { CheckIcon } from '@/shared/icons/Icons'
import { Modal } from './Modal'

interface SuccessModalProps {
  open: boolean
  onClose: () => void
  message: ReactNode
  ariaLabel?: string
  durationMs?: number
}

// A transient confirmation modal that auto-dismisses after `durationMs`.
export function SuccessModal({ open, onClose, message, ariaLabel, durationMs = 2000 }: SuccessModalProps) {
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(onClose, durationMs)
    return () => { window.clearTimeout(timer) }
  }, [open, onClose, durationMs])

  return (
    <Modal open={open} onClose={onClose} {...(ariaLabel ? { ariaLabel } : {})}>
      <div className="flex flex-col items-center gap-3 px-6 py-8 text-center" role="status">
        <span className="flex size-12 items-center justify-center rounded-full bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500">
          <CheckIcon className="size-6" />
        </span>
        <p className="text-sm font-medium text-text-primary">{message}</p>
      </div>
    </Modal>
  )
}
