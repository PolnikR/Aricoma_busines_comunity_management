import { useTranslation } from '@/hooks/useTranslation'

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-[#17233d] mb-2">{t('dialogs.deleteApplication')}</h3>
          <p className="text-sm text-gray-600 mb-6">
            {t('dialogs.deleteApplicationMessage').replace('{itemName}', itemName)}
          </p>
        </div>
        <div className="border-t border-[#e3edf6] p-4 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-[#44536c] hover:bg-[#f5f7fa] rounded-lg transition disabled:opacity-50"
          >
            {t('buttons.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
          >
            {isLoading ? t('messages.deleting') : t('buttons.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}
