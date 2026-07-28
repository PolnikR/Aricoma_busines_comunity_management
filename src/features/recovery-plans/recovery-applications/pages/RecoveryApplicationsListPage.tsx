import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { DataTableSkeleton } from '@/shared/components/data-table'
import { useTranslation } from '@/hooks/useTranslation'
import { RecoveryApplicationsTable } from '../components/RecoveryApplicationsTable'
import { useRecoveryApplications } from '../api/useRecoveryApplications'
import { toRecoveryApplicationFileName } from '../utils/recoveryApplicationFileName'

export function RecoveryApplicationsListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: applications, isLoading, error, isFetching, refetch } = useRecoveryApplications()

  const handleEdit = (id: string): void => {
    const routeId = toRecoveryApplicationFileName(id)
    void navigate(`/recovery-plans/recovery-applications/${encodeURIComponent(routeId)}/edit`)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
        <TableToolbar
          eyebrow={t('pages.recovery.eyebrow')}
          title={t('pages.recovery.title')}
          description={t('pages.recovery.description')}
          actions={
            <Button size="sm" variant="outline" onClick={() => { void navigate('/recovery-plans/recovery-applications/create') }}>
              {t('pages.recovery.createButton')}
            </Button>
          }
        />
        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-3 lg:min-h-0">
          <DataTableSkeleton
            columnCount={7}
            ariaLabel={t('pages.recovery.loading')}
            className="flex-1 lg:min-h-0"
          />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
        <TableToolbar
          eyebrow={t('pages.recovery.eyebrow')}
          title={t('pages.recovery.title')}
          description={t('pages.recovery.description')}
        />
        <div className="flex-1 p-6">
          <FetchErrorAlert
            title={t('pages.recovery.error.title')}
            description={error instanceof Error ? error.message : t('pages.recovery.error.unknown')}
            retryLabel={t('pages.recovery.error.retryButton')}
            variant="full"
            onRetry={() => { void refetch() }}
          />
        </div>
      </div>
    )
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
        {!applications || applications.length === 0 ? (
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
          <>
            <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg border border-[#dbe7f2] shadow-sm overflow-hidden">
              <RecoveryApplicationsTable applications={applications} onEdit={handleEdit} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
