import { useNavigate } from 'react-router'
import { Button } from '@/shared/components/button/Button'
import { Alert } from '@/shared/components/alert/Alert'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useTranslation } from '@/hooks/useTranslation'
import { routes } from '@/app/routes'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { RecoveryGroupsTable } from '../components/RecoveryGroupsTable'
import { useRecoveryGroups } from '../hooks/useRecoveryGroups'
import { getRecoveryGroupsErrorKey } from '../utils/recoveryGroupsErrorMessage'

export function RecoveryGroupsListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { groups, remove, rollback, isLoading, isFetching, isDeleting, error, refresh, mutationError } = useRecoveryGroups()
  const navigateToCreate = () => { void navigate(`${routes.recoveryGroups}/create`) }
  const navigateToEdit = (id: string) => {
    void navigate(`${routes.recoveryGroups}/${encodeURIComponent(id)}/edit`)
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t('pages.recoveryGroups.eyebrow')}
        title={t('pages.recoveryGroups.title')}
        description={t('pages.recoveryGroups.description')}
        isFetching={isFetching}
        onRefresh={() => { void refresh() }}
        actions={
          <Button size="sm" variant="outline" onClick={navigateToCreate}>
            {t('pages.recoveryGroups.createButton')}
          </Button>
        }
      />

      <InventoryShell
        notice={mutationError ? (
          <Alert
            variant="error"
            title={t(getRecoveryGroupsErrorKey(mutationError))}
            description={extractBackendErrorDetail(mutationError)}
          />
        ) : null}
      >
        <RecoveryGroupsTable
          groups={groups}
          isLoading={isLoading}
          onEdit={navigateToEdit}
          onDelete={remove}
          onRollback={rollback}
          error={error instanceof Error ? error : null}
          isRetrying={isFetching}
          isDeleting={isDeleting}
          onRetry={() => { void refresh() }}
          onCreate={navigateToCreate}
        />
      </InventoryShell>
    </div>
  )
}
