import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { routes } from '@/app/routes'
import { useUnsavedChangesGuard } from '../../recovery-applications/hooks/useUnsavedChangesGuard'
import { RecoveryGroupBuilder } from '../components/RecoveryGroupBuilder'
import { useRecoveryGroups } from '../hooks/useRecoveryGroups'
import type { RecoveryGroupDraft } from '../model/recoveryGroupTypes'
import { getRecoveryGroupsErrorKey } from '../utils/recoveryGroupsErrorMessage'

export function RecoveryGroupEditorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const {
    groups,
    update,
    isLoading,
    isUpdating,
    error: loadError,
    refresh,
  } = useRecoveryGroups()
  const [isDirty, setIsDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigationGuard = useUnsavedChangesGuard(isDirty)
  const group = groups.find(item => item.id === id)

  const navigateToGroups = () => { void navigate(routes.recoveryGroups) }
  const requestBack = () => { navigationGuard.requestNavigation(navigateToGroups) }

  const handleUpdate = async (draft: RecoveryGroupDraft) => {
    try {
      await update(id, draft)
      setIsDirty(false)
      navigationGuard.runWithoutBlocking(navigateToGroups)
    } catch (cause) {
      setError(t(getRecoveryGroupsErrorKey(cause)))
    }
  }

  if (isLoading) {
    return <div className="p-6" role="status">{t('pages.recoveryGroups.loading')}</div>
  }

  if (loadError) {
    return (
      <div className="p-6">
        <FetchErrorAlert
          title={t('pages.recoveryGroups.errors.load')}
          onRetry={() => { void refresh() }}
          retryLabel={t('buttons.retry')}
          variant="full"
        />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
          {t('pages.recoveryGroupEditor.error.notFound')}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow={t('pages.recoveryGroupEditor.eyebrow')}
        title={t('pages.recoveryGroupEditor.title')}
        description={t('pages.recoveryGroupEditor.description')}
        actions={<Button size="sm" variant="outline" onClick={requestBack}>{t('buttons.back')}</Button>}
      />
      {error ? <div className="mx-4 mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div> : null}
      <RecoveryGroupBuilder
        initialData={group}
        submitLabel={t('pages.recoveryGroupEditor.saveButton')}
        onCreate={draft => { void handleUpdate(draft) }}
        onCancel={requestBack}
        onDirtyChange={setIsDirty}
        existingIds={groups.map(item => item.id)}
        isSaving={isUpdating}
      />
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
