import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/shared/components/button/Button'
import { Alert } from '@/shared/components/alert/Alert'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { RecoveryAppBuilder } from '../components/RecoveryAppBuilder'
import { RecoveryApplicationOrchestratorSuccessModal } from '../components/RecoveryApplicationOrchestratorSuccessModal'
import { useSubmitRecoveryApplication } from '../hooks/useRecoveryApplications'
import { toRecoveryApplicationData } from '../utils/recoveryApplicationFormMapper'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import type { OrchestratorPush, RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

export function RecoveryApplicationBuilderPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const submitApplication = useSubmitRecoveryApplication()
  const [isDirty, setIsDirty] = useState(false)
  const [orchestratorPush, setOrchestratorPush] = useState<OrchestratorPush | null>(null)
  const [orchestratedApplicationName, setOrchestratedApplicationName] = useState('')
  const navigationGuard = useUnsavedChangesGuard(isDirty)

  const handleSave = (appState: RecoveryApplicationFormState): void => {
    submitApplication.mutate({
      providerId: appState.orchestrationProviderId,
      data: toRecoveryApplicationData(appState),
      pushToOrchestrator: appState.pushToOrchestrator,
    }, {
      onSuccess: (response) => {
        setIsDirty(false)
        if (appState.pushToOrchestrator && 'orchestrator_push' in response) {
          setOrchestratedApplicationName(appState.name)
          setOrchestratorPush(response.orchestrator_push)
          return
        }
        navigationGuard.runWithoutBlocking(() => {
          void navigate('/recovery-plans/recovery-applications')
        })
      },
    })
  }

  const navigateToApplications = (): void => {
    void navigate('/recovery-plans/recovery-applications')
  }

  const handleBackClick = (): void => {
    navigationGuard.requestNavigation(navigateToApplications)
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow={t('pages.recoveryBuilder.eyebrow')}
        title={t('pages.recoveryBuilder.title')}
        description={t('pages.recoveryBuilder.description')}
        actions={<Button size="sm" variant="outline" onClick={handleBackClick}>{t('buttons.back')}</Button>}
      />
      <div className="flex flex-1 flex-col lg:min-h-0">
        {submitApplication.error ? (
          <Alert
            variant="error"
            className="mx-4 mt-4"
            title={submitApplication.error instanceof Error
              ? submitApplication.error.message
              : t('pages.recovery.submitFailed')}
          />
        ) : null}
        <RecoveryAppBuilder
          onCancel={handleBackClick}
          onSave={handleSave}
          onDirtyChange={setIsDirty}
          isSaving={submitApplication.isPending}
        />
      </div>
      <ConfirmDialog
        open={navigationGuard.isNavigationBlocked}
        title={t('recovery.builder.discardDialog.title')}
        message={t('recovery.builder.discardDialog.message')}
        cancelLabel={t('recovery.builder.discardDialog.cancel')}
        confirmLabel={t('recovery.builder.discardDialog.confirm')}
        tone="danger"
        onCancel={navigationGuard.cancelNavigation}
        onConfirm={navigationGuard.confirmNavigation}
      />
      {orchestratorPush ? (
        <RecoveryApplicationOrchestratorSuccessModal
          open
          onClose={() => {
            setOrchestratorPush(null)
            setOrchestratedApplicationName('')
            navigationGuard.runWithoutBlocking(() => {
              void navigate('/recovery-plans/recovery-applications')
            })
          }}
          applicationName={orchestratedApplicationName}
          orchestratorPush={orchestratorPush}
        />
      ) : null}
    </div>
  )
}
