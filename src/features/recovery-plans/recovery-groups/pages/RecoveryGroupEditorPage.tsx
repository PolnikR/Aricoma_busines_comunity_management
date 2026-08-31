import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '@/shared/components/button/Button'
import { Alert } from '@/shared/components/alert/Alert'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
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
  const { data: platformProviders = [] } = usePlatformProviders()
  const [isDirty, setIsDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orchestratorRun, setOrchestratorRun] = useState<OrchestratorRunInfo | null>(null)
  const navigationGuard = useUnsavedChangesGuard(isDirty)
  const group = groups.find(item => item.id === id)
  const loadErrorDescription = extractBackendErrorDetail(loadError)

  const navigateToGroups = () => { void navigate(routes.recoveryGroups) }
  const requestBack = () => { navigationGuard.requestNavigation(navigateToGroups) }

  const handleUpdate = async (draft: RecoveryGroupDraft) => {
    try {
      const updated = await update(id, draft)
      setIsDirty(false)
      if (draft.pushToOrchestrator) {
        const provider = platformProviders.find(candidate => candidate.id === draft.orchestrationProviderId)
        setOrchestratorRun({
          groupName: draft.name,
          runId: updated.airflowRunId ?? null,
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

  if (loadError) {
    return (
      <div className="p-6">
        <FetchErrorAlert
          title={t('pages.recoveryGroups.errors.load')}
          {...(loadErrorDescription ? { description: loadErrorDescription } : {})}
          onRetry={() => { void refresh() }}
          retryLabel={t('buttons.retry')}
          variant="full"
        />
      </div>
    )
  }

  if (!isLoading && !group) {
    return (
      <div className="p-6">
        <Alert variant="error" title={t('pages.recoveryGroupEditor.error.notFound')} />
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
      <div className="flex flex-1 flex-col lg:min-h-0">
        {error ? <Alert variant="error" className="mx-4 mt-4" title={error} /> : null}
        <RecoveryGroupBuilder
          key={group?.id ?? 'loading'}
          {...(group ? { initialData: group } : {})}
          submitLabel={t('pages.recoveryGroupEditor.saveButton')}
          onCreate={draft => { void handleUpdate(draft) }}
          onCancel={requestBack}
          onDirtyChange={setIsDirty}
          existingIds={groups.map(item => item.id)}
          isSaving={isUpdating}
          isInitialLoading={isLoading}
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
