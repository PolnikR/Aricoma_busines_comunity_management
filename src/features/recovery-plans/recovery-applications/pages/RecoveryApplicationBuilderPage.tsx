import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { RecoveryAppBuilder } from '../components/RecoveryAppBuilder'
import { useSubmitRecoveryApplication } from '../api/useRecoveryApplications'
import { toRecoveryApplicationData } from '../utils/recoveryApplicationFormMapper'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

export function RecoveryApplicationBuilderPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const submitApplication = useSubmitRecoveryApplication()
  const [isDirty, setIsDirty] = useState(false)
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false)

  const handleSave = (appState: RecoveryApplicationFormState): void => {
    submitApplication.mutate({
      fileName: appState.fileName,
      data: toRecoveryApplicationData(appState),
    }, {
      onSuccess: () => {
        setIsDirty(false)
        void navigate('/recovery-plans/recovery-applications')
      },
    })
  }

  const navigateToApplications = (): void => {
    void navigate('/recovery-plans/recovery-applications')
  }

  const handleBackClick = (): void => {
    if (isDirty) {
      setIsDiscardDialogOpen(true)
      return
    }

    navigateToApplications()
  }

  const handleDiscardChanges = (): void => {
    setIsDiscardDialogOpen(false)
    setIsDirty(false)
    navigateToApplications()
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow="Recovery Plans"
        title="Create Recovery Application"
        description="Define a new disaster recovery application with tiered VM organization"
        actions={<Button size="sm" variant="outline" onClick={handleBackClick}>{t('buttons.back')}</Button>}
      />
      <div className="flex flex-1 flex-col lg:min-h-0">
        {submitApplication.error ? (
          <div className="mx-4 mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
            {submitApplication.error instanceof Error
              ? submitApplication.error.message
              : 'Failed to submit recovery application.'}
          </div>
        ) : null}
        <RecoveryAppBuilder
          onSave={handleSave}
          onDirtyChange={setIsDirty}
          isSaving={submitApplication.isPending}
        />
      </div>
      <ConfirmDialog
        open={isDiscardDialogOpen}
        title={t('recovery.builder.discardDialog.title')}
        message={t('recovery.builder.discardDialog.message')}
        cancelLabel={t('recovery.builder.discardDialog.cancel')}
        confirmLabel={t('recovery.builder.discardDialog.confirm')}
        tone="danger"
        onCancel={() => { setIsDiscardDialogOpen(false) }}
        onConfirm={handleDiscardChanges}
      />
    </div>
  )
}
