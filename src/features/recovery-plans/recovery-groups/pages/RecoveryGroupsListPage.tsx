import { useNavigate } from 'react-router'
import { Button } from '@/shared/components/button/Button'
import { Alert } from '@/shared/components/alert/Alert'
import { DataTableSkeleton } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useTranslation } from '@/hooks/useTranslation'
import { routes } from '@/app/routes'
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

      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-3 lg:min-h-0">
        {mutationError ? (
          <Alert variant="error" title={t(getRecoveryGroupsErrorKey(mutationError))} />
        ) : null}
        {isLoading ? (
          <DataTableSkeleton
            columnCount={5}
            ariaLabel={t('pages.recoveryGroups.loading')}
            className="flex-1 lg:min-h-0"
          />
        ) : !error && groups.length === 0 ? (
          <EmptyState
            title={t('pages.recoveryGroups.empty.title')}
            description={t('pages.recoveryGroups.empty.description')}
            action={
              <Button onClick={navigateToCreate}>
                {t('pages.recoveryGroups.empty.createButton')}
              </Button>
            }
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            <RecoveryGroupsTable
              groups={groups}
              onEdit={navigateToEdit}
              onDelete={remove}
              onRollback={rollback}
              error={error instanceof Error ? error : null}
              isRetrying={isFetching}
              isDeleting={isDeleting}
              onRetry={() => { void refresh() }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
