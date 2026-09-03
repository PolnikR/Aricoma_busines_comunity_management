import { useNavigate } from 'react-router'
import { resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { Alert } from '@/shared/components/alert/Alert'
import { Button } from '@/shared/components/button/Button'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
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

      <InventoryShell
        notice={deleteError ? (
          <Alert
            variant="error"
            title={t('dialogs.deleteRecoveryApplication')}
            {...(deleteErrorDescription ? { description: deleteErrorDescription } : {})}
          />
        ) : null}
      >
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
      </InventoryShell>
    </div>
  )
}
