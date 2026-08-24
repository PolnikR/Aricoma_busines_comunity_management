import { Modal } from './Modal'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isDangerous?: boolean
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDangerous = false,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="text-sm text-text-secondary mb-6">{message}</div>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-surface-subtle border border-border rounded-lg hover:bg-surface"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 px-4 py-2 text-white rounded-lg ${
            isDangerous ? 'bg-error hover:bg-error/90' : 'bg-accent hover:bg-accent/90'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
