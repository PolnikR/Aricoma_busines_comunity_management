import { Modal } from './Modal'

interface JsonViewerModalProps {
  open: boolean
  title: string
  data: unknown
  onClose: () => void
}

export function JsonViewerModal({
  open,
  title,
  data,
  onClose,
}: JsonViewerModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="bg-surface-subtle rounded-lg p-4 max-h-96 overflow-y-auto">
        <pre className="text-xs font-mono text-text-secondary">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
      <button
        onClick={onClose}
        className="w-full mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
      >
        Close
      </button>
    </Modal>
  )
}
