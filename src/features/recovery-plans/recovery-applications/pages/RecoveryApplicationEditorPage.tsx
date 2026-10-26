import { useMemo } from 'react'
import { useParams } from 'react-router'
import { resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { Button } from '@/shared/components/button/Button'
import { Alert } from '@/shared/components/alert/Alert'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { SkeletonBlock } from '@/shared/components/data-table'
import { useTranslation } from '@/hooks/useTranslation'
import { RecoveryAppBuilder } from '../components/RecoveryAppBuilder'
import { OrchestratorPushResultDialog } from '@/shared/components/modal/OrchestratorPushResultDialog'
import {
  useRecoveryApplications,
  useSubmitRecoveryApplication,
} from '../hooks/useRecoveryApplications'
import { useRecoveryApplicationSaveCompletion } from '../hooks/useRecoveryApplicationSaveCompletion'
import {
  lockedProvidersOf,
  toRecoveryApplicationData,
  toRecoveryApplicationFormState,
} from '../utils/recoveryApplicationFormMapper'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'
import { toRecoveryApplicationFileName } from '../utils/recoveryApplicationFileName'
import { useGetPlatformProviders } from '@/generated/query/platform-providers/platform-providers.gen'
import { useGetProviders } from '@/generated/query/providers/providers.gen'
import { selectProviders } from '@/features/providers-connectors/providers/model/selectProviders'
import { selectPlatformProviders } from '@/features/platform-administration/platform-providers/model/selectPlatformProviders'

export function RecoveryApplicationEditorPage() {
  const { t } = useTranslation()
  const { id = '' } = useParams<{ id: string }>()
  const { data: applications, isLoading, error, isFetching, refetch } = useRecoveryApplications()
  const submitApplication = useSubmitRecoveryApplication()
  const { data: platformProviders = [] } = useGetPlatformProviders({ type: 'all' }, { query: { select: selectPlatformProviders } })
  const completion = useRecoveryApplicationSaveCompletion({ platformProviders })
  const { data: providers = [] } = useGetProviders({ role: 'all' }, { query: { select: selectProviders } })
  const loadErrorDescription = resolveUserFacingErrorMessage(error, t('pages.recoveryEditor.requestFailed'))
  const submitErrorDescription = resolveUserFacingErrorMessage(submitApplication.error, '')
  const application = applications?.find(
    (item) => toRecoveryApplicationFileName(item.id) === id,
  )
  const lockedProviders = useMemo(
    () => application ? lockedProvidersOf(application) : null,
    [application],
  )
  const initialData = useMemo(
    () => application ? toRecoveryApplicationFormState(application) : null,
    [application],
  )

  const handleSave = (formState: RecoveryApplicationFormState): void => {
    const data = toRecoveryApplicationData(formState, providers, lockedProviders)
    if (!completion.beginSave()) return
    const submitted = {
      name: formState.name,
      pushToOrchestrator: formState.pushToOrchestrator,
      orchestrationProviderId: formState.orchestrationProviderId,
    }
    submitApplication.mutate({
      providerId: formState.orchestrationProviderId,
      data,
      pushToOrchestrator: formState.pushToOrchestrator,
    }, {
      onSuccess: (response) => {
        completion.completeSave({ submitted, response })
      },
      onError: completion.failSave,
    })
  }

  if (error) {
    return (
      <div className="flex min-h-full flex-col">
        <PageHeader
          title={t('pages.recoveryEditor.title')}
          description={t('pages.recoveryEditor.loadDescription')}
          actions={<Button size="sm" variant="outline" disabled={completion.isSaving} onClick={completion.requestBack}>{t('buttons.back')}</Button>}
        />
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <FetchErrorAlert
            title={t('pages.recoveryEditor.error.failed')}
            description={loadErrorDescription}
            retryLabel={t('pages.providers.detail.retry')}
            isRetrying={isFetching}
            variant="full"
            onRetry={() => { void refetch() }}
          />
        </div>
      </div>
    )
  }

  if (!isLoading && !initialData) {
    return (
      <div className="flex min-h-full flex-col">
        <PageHeader
          title={t('pages.recoveryEditor.notFound')}
          description={t('pages.recoveryEditor.notFoundDescription')}
          actions={<Button size="sm" variant="outline" disabled={completion.isSaving} onClick={completion.requestBack}>{t('buttons.back')}</Button>}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        title={isLoading
          ? <span className="flex items-center gap-2">{t('buttons.edit')} <SkeletonBlock className="h-7 w-44" /></span>
          : `${t('buttons.edit')} ${initialData?.name ?? ''}`}
        description={t('pages.recoveryEditor.saveDescription')}
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
          key={initialData?.fileName ?? 'loading'}
          onCancel={completion.requestBack}
          {...(initialData ? { initialData } : {})}
          onSave={handleSave}
          onDirtyChange={completion.markDirty}
          isSaving={completion.isSaving}
          disableFileName
          isInitialLoading={isLoading}
          lockPushToOrchestrator={application?.pushToOrchestrator === true}
          lockedProviders={lockedProviders}
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
