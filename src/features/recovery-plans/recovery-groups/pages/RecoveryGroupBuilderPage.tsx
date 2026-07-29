import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { ListSkeleton } from '@/shared/components/list-skeleton/ListSkeleton'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { routes } from '@/app/routes'
import { useUnsavedChangesGuard } from '../../recovery-applications/hooks/useUnsavedChangesGuard'
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
  const navigationGuard = useUnsavedChangesGuard(isDirty)

  const navigateToGroups = () => { void navigate(routes.recoveryGroups) }
  const requestBack = () => { navigationGuard.requestNavigation(navigateToGroups) }

  const handleCreate = async (draft: RecoveryGroupDraft) => {
    try {
      await create(draft)
      setIsDirty(false)
      navigationGuard.runWithoutBlocking(navigateToGroups)
    } catch (cause) {
      setError(t(getRecoveryGroupsErrorKey(cause)))
    }
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
    </div>
  )
}
