import { Button } from '@/shared/components/button/Button'
import { ResponseBodyViewer } from '@/shared/components/response-body/ResponseBodyViewer'
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
      footer={<Button onClick={onClose} size="sm" fullWidth>{closeLabel}</Button>}
    >
      <div className="px-6 py-4">
        <ResponseBodyViewer data={data} defaultOpen />
      </div>
    </Modal>
  )
}
