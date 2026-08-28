import { useNavigate } from 'react-router'
import { resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { Alert } from '@/shared/components/alert/Alert'
import { Button } from '@/shared/components/button/Button'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { useTranslation } from '@/hooks/useTranslation'
import { RecoveryApplicationsTable } from '../components/RecoveryApplicationsTable'
import { useRecoveryApplications } from '../hooks/useRecoveryApplications'
import { useDeleteRecoveryApplication } from '../hooks/useDeleteRecoveryApplication'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import { toRecoveryApplicationFileName } from '../utils/recoveryApplicationFileName'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'

export function RecoveryApplicationsListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: applications, isLoading, error, isFetching, refetch } = useRecoveryApplications()
  const { data: providers = [] } = useProviders()
  const { mutateAsync: deleteApplication, isPending: isDeleting, error: deleteError } = useDeleteRecoveryApplication()
  const deleteErrorDescription = resolveUserFacingErrorMessage(deleteError, '')

  const handleEdit = (id: string): void => {
    const routeId = toRecoveryApplicationFileName(id)
    void navigate(`/recovery-plans/recovery-applications/${encodeURIComponent(routeId)}/edit`)
  }

  const handleDelete = (app: RecoveryApplicationListItem) => {
    return deleteApplication(app)
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t('pages.recovery.eyebrow')}
        title={t('pages.recovery.title')}
        description={t('pages.recovery.description')}
        isFetching={isFetching}
        onRefresh={() => { void refetch() }}
        actions={
          <Button size="sm" variant="outline" onClick={() => { void navigate('/recovery-plans/recovery-applications/create') }}>
            {t('pages.recovery.createButton')}
          </Button>
        }
      />

      <div className="flex-1 flex flex-col gap-4 lg:min-h-0 overflow-hidden p-3">
        {deleteError ? (
          <Alert
            variant="error"
            title={t('dialogs.deleteRecoveryApplication')}
            {...(deleteErrorDescription ? { description: deleteErrorDescription } : {})}
          />
        ) : null}
        {!isLoading && !error && (!applications || applications.length === 0) ? (
          <EmptyState
            title={t('pages.recovery.empty.title')}
            description={t('pages.recovery.empty.description')}
            action={
              <Button onClick={() => { void navigate('/recovery-plans/recovery-applications/create') }}>
                {t('pages.recovery.empty.createButton')}
              </Button>
            }
          />
        ) : (
          <div className="flex-1 flex flex-col min-h-0 bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
            <RecoveryApplicationsTable
              applications={applications ?? []}
              isLoading={isLoading}
              providers={providers}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={isDeleting}
              error={error instanceof Error ? error : null}
              isRetrying={isFetching}
              onRetry={() => { void refetch() }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
