import type { ReactNode } from 'react'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  loadingLabel?: string
  tone?: 'default' | 'danger'
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Reusable confirmation dialog built on the shared Modal shell.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loadingLabel = 'Working…',
  tone = 'default',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmClassName = tone === 'danger'
    ? 'bg-red-600 hover:enabled:bg-red-700'
    : 'bg-[#0d91d7] hover:enabled:bg-[#0a7bc4]'

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-[#d7deea] px-4 py-2 text-sm font-semibold text-[#17233d] transition hover:bg-[#f1f5fa] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmClassName}`}
          >
            {isLoading ? loadingLabel : confirmLabel}
          </button>
        </>
      }
    >
      <div className="px-6 py-4 text-sm text-[#44536c]">{message}</div>
    </Modal>
  )
}
