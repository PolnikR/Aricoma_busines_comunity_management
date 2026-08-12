import { Button } from '@/shared/components/button/Button'
import { Modal } from './Modal'

interface JsonViewerModalProps {
  open: boolean
  title: string
  data: unknown
  closeLabel: string
  onClose: () => void
}

export function JsonViewerModal({
  open,
  title,
  data,
  closeLabel,
  onClose,
}: JsonViewerModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      className="flex max-h-96 flex-col overflow-hidden"
      footer={<Button onClick={onClose} size="sm" fullWidth>{closeLabel}</Button>}
    >
      <div className="flex-1 overflow-y-auto bg-surface-subtle px-6 py-4">
        <pre className="whitespace-pre-wrap break-words font-mono text-xs text-text-secondary">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </Modal>
  )
}
