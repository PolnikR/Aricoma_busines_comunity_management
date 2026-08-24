import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/shared/components/button/Button'
import { Alert } from '@/shared/components/alert/Alert'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { ListSkeleton } from '@/shared/components/list-skeleton/ListSkeleton'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { routes } from '@/app/routes'
import { extractBackendErrorDetail, resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { usePlatformProviders } from '@/features/platform-administration/platform-providers/hooks/usePlatformProviders'
import { RecoveryGroupBuilder } from '../components/RecoveryGroupBuilder'
import { RecoveryGroupOrchestratorSuccessModal } from '../components/RecoveryGroupOrchestratorSuccessModal'
import { useRecoveryGroups } from '../hooks/useRecoveryGroups'
import type { RecoveryGroupDraft } from '../model/recoveryGroupTypes'
import { RecoveryGroupsError } from '../api/recoveryGroupsErrors'
import { getRecoveryGroupsErrorKey } from '../utils/recoveryGroupsErrorMessage'

interface OrchestratorRunInfo {
  groupName: string
  runId: string | null
  providerName: string | null
  providerUrl: string | null
}

export function RecoveryGroupBuilderPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { groups, create, isCreating, isLoading, error: loadError, refresh } = useRecoveryGroups()
  const { data: platformProviders = [] } = usePlatformProviders()
  const [isDirty, setIsDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orchestratorRun, setOrchestratorRun] = useState<OrchestratorRunInfo | null>(null)
  const navigationGuard = useUnsavedChangesGuard(isDirty)
  const loadErrorDescription = extractBackendErrorDetail(loadError)

  const navigateToGroups = () => { void navigate(routes.recoveryGroups) }
  const requestBack = () => { navigationGuard.requestNavigation(navigateToGroups) }

  const handleCreate = async (draft: RecoveryGroupDraft) => {
    try {
      const created = await create(draft)
      setIsDirty(false)
      if (draft.pushToOrchestrator) {
        const provider = platformProviders.find(candidate => candidate.id === draft.orchestrationProviderId)
        setOrchestratorRun({
          groupName: draft.name,
          runId: created.airflowRunId ?? null,
          providerName: provider?.name ?? null,
          providerUrl: provider?.url ?? null,
        })
      } else {
        navigationGuard.runWithoutBlocking(navigateToGroups)
      }
    } catch (cause) {
      setError(cause instanceof RecoveryGroupsError
        ? t(getRecoveryGroupsErrorKey(cause))
        : resolveUserFacingErrorMessage(cause, t(getRecoveryGroupsErrorKey(cause))))
    }
  }

  const handleSuccessModalClose = () => {
    setOrchestratorRun(null)
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
      {error ? <Alert variant="error" className="mx-4 mt-4" title={error} /> : null}
      {isLoading ? (
        <div className="p-4"><ListSkeleton ariaLabel={t('pages.recoveryGroups.loading')} /></div>
      ) : loadError ? (
        <div className="p-4">
          <FetchErrorAlert
            title={t('pages.recoveryGroups.errors.load')}
            {...(loadErrorDescription ? { description: loadErrorDescription } : {})}
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
      <RecoveryGroupOrchestratorSuccessModal
        open={orchestratorRun !== null}
        onClose={handleSuccessModalClose}
        groupName={orchestratorRun?.groupName ?? ''}
        runId={orchestratorRun?.runId ?? null}
        providerName={orchestratorRun?.providerName ?? null}
        providerUrl={orchestratorRun?.providerUrl ?? null}
      />
    </div>
  )
}
