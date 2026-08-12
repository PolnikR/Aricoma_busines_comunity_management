import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '@/shared/components/button/Button'
import { Alert } from '@/shared/components/alert/Alert'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { RecoveryAppBuilder } from '../components/RecoveryAppBuilder'
import {
  useRecoveryApplications,
  useSubmitRecoveryApplication,
} from '../hooks/useRecoveryApplications'
import {
  toRecoveryApplicationData,
  toRecoveryApplicationFormState,
} from '../utils/recoveryApplicationFormMapper'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { toRecoveryApplicationFileName } from '../utils/recoveryApplicationFileName'

export function RecoveryApplicationEditorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams<{ id: string }>()
  const { data: applications, isLoading, error, isFetching, refetch } = useRecoveryApplications()
  const submitApplication = useSubmitRecoveryApplication()
  const [isDirty, setIsDirty] = useState(false)
  const navigationGuard = useUnsavedChangesGuard(isDirty)
  const application = applications?.find(
    (item) => toRecoveryApplicationFileName(item.id) === id,
  )
  const initialData = useMemo(
    () => application ? toRecoveryApplicationFormState(application) : null,
    [application],
  )

  const navigateToApplications = () => {
    void navigate('/recovery-plans/recovery-applications')
  }

  const goBack = () => {
    navigationGuard.requestNavigation(navigateToApplications)
  }

  const handleSave = (formState: RecoveryApplicationFormState): void => {
    submitApplication.mutate({
      providerId: formState.orchestrationProviderId,
      data: toRecoveryApplicationData(formState),
    }, {
      onSuccess: () => {
        setIsDirty(false)
        navigationGuard.runWithoutBlocking(navigateToApplications)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center text-sm text-text-muted" role="status">
        {t('pages.recoveryEditor.error.loading')}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-full flex-col">
        <PageHeader
          eyebrow={t('pages.recoveryEditor.eyebrow')}
          title={t('pages.recoveryEditor.title')}
          description={t('pages.recoveryEditor.loadDescription')}
          actions={<Button size="sm" variant="outline" onClick={goBack}>{t('buttons.back')}</Button>}
        />
        <div className="p-6">
          <FetchErrorAlert
            title={t('pages.recoveryEditor.error.failed')}
            description={error instanceof Error ? error.message : t('pages.recoveryEditor.requestFailed')}
            retryLabel={t('pages.providers.detail.retry')}
            isRetrying={isFetching}
            variant="full"
            onRetry={() => { void refetch() }}
          />
        </div>
      </div>
    )
  }

  if (!initialData) {
    return (
      <div className="flex min-h-full flex-col">
        <PageHeader
          eyebrow={t('pages.recoveryEditor.eyebrow')}
          title={t('pages.recoveryEditor.notFound')}
          description={t('pages.recoveryEditor.notFoundDescription')}
          actions={<Button size="sm" variant="outline" onClick={goBack}>{t('buttons.back')}</Button>}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow={t('pages.recoveryEditor.eyebrow')}
        title={`${t('buttons.edit')} ${initialData.name}`}
        description={t('pages.recoveryEditor.saveDescription')}
        actions={<Button size="sm" variant="outline" onClick={goBack}>{t('buttons.back')}</Button>}
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
          initialData={initialData}
          onSave={handleSave}
          onDirtyChange={setIsDirty}
          isSaving={submitApplication.isPending}
          disableFileName
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
    </div>
  )
}
