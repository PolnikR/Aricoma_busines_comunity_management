import { useTranslation } from '@/hooks/useTranslation'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'

interface DeleteConfirmationDialogProps {
  itemName: string
  isOpen: boolean
  isLoading?: boolean
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export function DeleteConfirmationDialog({
  itemName,
  isOpen,
  isLoading = false,
  onConfirm,
  onCancel,
}: DeleteConfirmationDialogProps) {
  const { t } = useTranslation()
  if (!isOpen) return null

  const handleConfirm = () => {
    void onConfirm()
  }

  return (
    <ConfirmDialog
      open={isOpen}
      title={t('dialogs.deleteApplication')}
      message={t('dialogs.deleteApplicationMessage').replace('{itemName}', itemName)}
      confirmLabel={t('buttons.delete')}
      cancelLabel={t('buttons.cancel')}
      loadingLabel={t('messages.deleting')}
      tone="danger"
      isLoading={isLoading}
      onConfirm={handleConfirm}
      onCancel={onCancel}
    />
  )
}
