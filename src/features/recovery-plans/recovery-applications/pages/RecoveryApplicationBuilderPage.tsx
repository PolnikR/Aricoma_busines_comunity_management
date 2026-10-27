import { resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { Button } from '@/shared/components/button/Button'
import { Alert } from '@/shared/components/alert/Alert'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { RecoveryAppBuilder } from '../components/RecoveryAppBuilder'
import { OrchestratorPushResultDialog } from '@/shared/components/modal/OrchestratorPushResultDialog'
import { useSubmitRecoveryApplication } from '../hooks/useRecoveryApplications'
import { useRecoveryApplicationSaveCompletion } from '../hooks/useRecoveryApplicationSaveCompletion'
import { toRecoveryApplicationData } from '../utils/recoveryApplicationFormMapper'
import { useGetPlatformProviders } from '@/generated/query/platform-providers/platform-providers.gen'
import { useGetProviders } from '@/generated/query/providers/providers.gen'
import { selectProviders } from '@/features/providers-connectors/providers/model/selectProviders'
import { selectPlatformProviders } from '@/features/platform-administration/platform-providers/model/selectPlatformProviders'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

export function RecoveryApplicationBuilderPage() {
  const { t } = useTranslation()
  const submitApplication = useSubmitRecoveryApplication()
  const { data: platformProviders = [] } = useGetPlatformProviders({ type: 'all' }, { query: { select: selectPlatformProviders } })
  const completion = useRecoveryApplicationSaveCompletion({ platformProviders })
  const { data: providers = [] } = useGetProviders({ role: 'all' }, { query: { select: selectProviders } })
  const submitErrorDescription = resolveUserFacingErrorMessage(submitApplication.error, '')

  const handleSave = (appState: RecoveryApplicationFormState): void => {
    const data = toRecoveryApplicationData(appState, providers)
    if (!completion.beginSave()) return
    const submitted = {
      name: appState.name,
      pushToOrchestrator: appState.pushToOrchestrator,
      orchestrationProviderId: appState.orchestrationProviderId,
    }
    submitApplication.mutate({
      providerId: appState.orchestrationProviderId,
      data,
      pushToOrchestrator: appState.pushToOrchestrator,
    }, {
      onSuccess: (response) => {
        completion.completeSave({ submitted, response })
      },
      onError: completion.failSave,
    })
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        title={t('pages.recoveryBuilder.title')}
        description={t('pages.recoveryBuilder.description')}
        actions={<Button size="sm" variant="outline" disabled={completion.isSaving} onClick={completion.requestBack}>{t('buttons.back')}</Button>}
      />
      <div className="flex flex-1 flex-col lg:min-h-0">
        {submitApplication.error ? (
          <Alert
            variant="error"
            className="mx-4 mt-4"
            title={t('pages.recovery.submitFailed')}
            {...(submitErrorDescription ? { description: submitErrorDescription } : {})}
          />
        ) : null}
        <RecoveryAppBuilder
          onCancel={completion.requestBack}
          onSave={handleSave}
          onDirtyChange={completion.markDirty}
          isSaving={completion.isSaving}
        />
      </div>
      <ConfirmDialog
        open={completion.discardDialog.open}
        title={t('recovery.builder.discardDialog.title')}
        message={t('recovery.builder.discardDialog.message')}
        cancelLabel={t('recovery.builder.discardDialog.cancel')}
        confirmLabel={t('recovery.builder.discardDialog.confirm')}
        tone="danger"
        onCancel={completion.discardDialog.cancel}
        onConfirm={completion.discardDialog.confirm}
      />
      {completion.pushDialog !== null ? (
        <OrchestratorPushResultDialog
          entityType="application"
          open
          onClose={completion.dismissPushDialog}
          entityName={completion.pushDialog.entityName}
          result={completion.pushDialog.result}
          providerUrl={completion.pushDialog.providerUrl}
        />
      ) : null}
    </div>
  )
}
