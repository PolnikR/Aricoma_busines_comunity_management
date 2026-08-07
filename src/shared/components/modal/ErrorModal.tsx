import { Modal } from './Modal'

interface ErrorModalProps {
  open: boolean
  title: string
  message: string
  onClose: () => void
  actionLabel?: string
}

export function ErrorModal({
  open,
  title,
  message,
  onClose,
  actionLabel = 'Close',
}: ErrorModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-sm text-text-secondary mb-6">{message}</div>
      <button
        onClick={onClose}
        className="w-full px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90"
      >
        {actionLabel}
      </button>
    </Modal>
  )
}
