import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/shared/components/button/Button'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { SuccessModal } from '@/shared/components/modal/SuccessModal'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { ListSkeleton } from '@/shared/components/list-skeleton/ListSkeleton'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { routes } from '@/app/routes'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { RecoveryGroupBuilder } from '../components/RecoveryGroupBuilder'
import { useRecoveryGroups } from '../hooks/useRecoveryGroups'
import type { RecoveryGroupDraft } from '../model/recoveryGroupTypes'
import { getRecoveryGroupsErrorKey } from '../utils/recoveryGroupsErrorMessage'

export function RecoveryGroupBuilderPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { groups, create, isCreating, isLoading, error: loadError, refresh } = useRecoveryGroups()
  const [isDirty, setIsDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdAirflowRunId, setCreatedAirflowRunId] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const navigationGuard = useUnsavedChangesGuard(isDirty)

  const navigateToGroups = () => { void navigate(routes.recoveryGroups) }
  const requestBack = () => { navigationGuard.requestNavigation(navigateToGroups) }

  const handleCreate = async (draft: RecoveryGroupDraft) => {
    try {
      const created = await create(draft)
      setIsDirty(false)
      if (draft.pushToOrchestrator) {
        setCreatedAirflowRunId(created.airflowRunId ?? null)
        setShowSuccess(true)
      } else {
        navigationGuard.runWithoutBlocking(navigateToGroups)
      }
    } catch (cause) {
      setError(t(getRecoveryGroupsErrorKey(cause)))
    }
  }

  const handleSuccessModalClose = () => {
    setShowSuccess(false)
    navigationGuard.runWithoutBlocking(navigateToGroups)
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow={t('pages.recoveryGroupBuilder.eyebrow')}
        title={t('pages.recoveryGroupBuilder.title')}
        description={t('pages.recoveryGroupBuilder.description')}
        actions={<Button size="sm" variant="outline" onClick={requestBack}>{t('buttons.back')}</Button>}
      />
      {error ? <div className="mx-4 mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div> : null}
      {isLoading ? (
        <div className="p-4"><ListSkeleton ariaLabel={t('pages.recoveryGroups.loading')} /></div>
      ) : loadError ? (
        <div className="p-4">
          <FetchErrorAlert
            title={t('pages.recoveryGroups.errors.load')}
            onRetry={() => { void refresh() }}
            retryLabel={t('buttons.retry')}
            variant="full"
          />
        </div>
      ) : (
        <RecoveryGroupBuilder
          onCreate={draft => { void handleCreate(draft) }}
          onCancel={requestBack}
          onDirtyChange={setIsDirty}
          existingIds={groups.map(group => group.id)}
          isSaving={isCreating}
        />
      )}
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
      <SuccessModal
        open={showSuccess}
        onClose={handleSuccessModalClose}
        ariaLabel={t('recoveryGroups.successModal.ariaLabel')}
        message={createdAirflowRunId
          ? t('recoveryGroups.successModal.messageWithRunId').replace('{airflowRunId}', createdAirflowRunId)
          : t('recoveryGroups.successModal.messageWithoutRunId')}
      />
    </div>
  )
}
