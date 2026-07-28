import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { RecoveryAppBuilder } from '../components/RecoveryAppBuilder'
import {
  useRecoveryApplications,
  useSubmitRecoveryApplication,
} from '../api/useRecoveryApplications'
import {
  toRecoveryApplicationData,
  toRecoveryApplicationFormState,
} from '../utils/recoveryApplicationFormMapper'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

export function RecoveryApplicationEditorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams<{ id: string }>()
  const { data: applications, isLoading, error, isFetching, refetch } = useRecoveryApplications()
  const submitApplication = useSubmitRecoveryApplication()
  const application = applications?.find((item) => item.id === id)
  const initialData = useMemo(
    () => application ? toRecoveryApplicationFormState(application) : null,
    [application],
  )

  const goBack = () => {
    void navigate('/recovery-plans/recovery-applications')
  }

  const handleSave = (formState: RecoveryApplicationFormState): void => {
    submitApplication.mutate(toRecoveryApplicationData(formState), {
      onSuccess: goBack,
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center text-sm text-[#71819a]" role="status">
        Loading recovery application
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-full flex-col">
        <PageHeader
          eyebrow="Recovery Plans"
          title="Edit Recovery Application"
          description="Load the recovery application from the backend."
          actions={<Button size="sm" variant="outline" onClick={goBack}>{t('buttons.back')}</Button>}
        />
        <div className="p-6">
          <FetchErrorAlert
            title="Failed to load recovery application"
            description={error instanceof Error ? error.message : 'The recovery application request failed.'}
            retryLabel="Retry"
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
          eyebrow="Recovery Plans"
          title="Recovery application not found"
          description="The requested backend file does not exist."
          actions={<Button size="sm" variant="outline" onClick={goBack}>{t('buttons.back')}</Button>}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow="Recovery Plans"
        title={`Edit ${initialData.name}`}
        description="Saving submits the current filename to the backend upsert endpoint."
        actions={<Button size="sm" variant="outline" onClick={goBack}>{t('buttons.back')}</Button>}
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
          initialData={initialData}
          onSave={handleSave}
          isSaving={submitApplication.isPending}
        />
      </div>
    </div>
  )
}
