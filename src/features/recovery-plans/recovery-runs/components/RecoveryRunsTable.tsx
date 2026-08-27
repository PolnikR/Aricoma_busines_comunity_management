import { useTranslation } from '@/hooks/useTranslation'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { Badge } from '@/shared/components/badge/Badge'
import {
  DataTable,
  DataTablePagination,
  DataTableRequestState,
  DataTableSkeleton,
  DataTableToolbar,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { formatRunDuration, formatRunTimestamp, runStatusBadgeColor } from '../helpers/formatRecoveryRun'
import type { LatestRunRequestState, OrchestratedEntity } from '../model/recoveryRunTypes'

export interface RecoveryRunRow {
  id: string
  name: string
  entityType: OrchestratedEntity['entityType']
  dagId: string
  latestRunState: LatestRunRequestState
}

function getColumns(
  t: ReturnType<typeof useTranslation>['t'],
  showEntityType: boolean,
  onRetry: () => void,
): ColumnDef<RecoveryRunRow>[] {
  const columns: ColumnDef<RecoveryRunRow>[] = [
    {
      id: 'app',
      header: t('recoveryRuns.table.application'),
      cell: row => (
        <>
          <span className="block font-semibold text-text-primary">{row.name}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-text-subtle">{row.id}</span>
        </>
      ),
    },
  ]

  if (showEntityType) {
    columns.push({
      id: 'entityType',
      header: t('recoveryRuns.table.type'),
      cell: row => (
        <Badge color="light" size="sm">
          {t(row.entityType === 'group' ? 'recoveryRuns.table.typeGroup' : 'recoveryRuns.table.typeApplication')}
        </Badge>
      ),
    })
  }

  columns.push(
    {
      id: 'status',
      header: t('recoveryRuns.table.latestRun'),
      cell: row => {
        const state = row.latestRunState
        if (state.status === 'loading') {
          return <span className="text-text-muted" role="status">{t('recoveryRuns.table.runLoading')}</span>
        }
        if (state.status === 'error') {
          return (
            <span className="flex items-center gap-2 text-danger">
              {t('recoveryRuns.table.runLoadFailed')}
              <button
                type="button"
                className="text-xs font-semibold underline"
                onClick={(event) => { event.stopPropagation(); onRetry() }}
              >
                {t('buttons.retry')}
              </button>
            </span>
          )
        }
        if (state.status === 'empty') {
          return (
            <span className="text-text-subtle">
              {t('recoveryRuns.table.noRuns')}
              {state.refreshError ? <span className="ml-2 text-danger">{t('recoveryRuns.table.runRefreshFailed')}</span> : null}
            </span>
          )
        }
        return (
          <span className="flex items-center gap-2">
            <Badge color={runStatusBadgeColor(state.run.status)} size="sm">{state.run.status}</Badge>
            {state.refreshError ? <span className="text-xs text-danger">{t('recoveryRuns.table.runRefreshFailed')}</span> : null}
          </span>
        )
      },
    },
    {
      id: 'started',
      header: t('recoveryRuns.table.started'),
      cell: row => <span className="font-mono text-xs">{formatRunTimestamp(row.latestRunState.status === 'data' ? row.latestRunState.run.startedAt : null)}</span>,
    },
    {
      id: 'duration',
      header: t('recoveryRuns.table.duration'),
      align: 'right',
      cell: row => <span className="font-mono text-xs tabular-nums">{formatRunDuration(row.latestRunState.status === 'data' ? row.latestRunState.run.durationSeconds : null)}</span>,
    },
  )

  return columns
}

interface RecoveryRunsTableProps {
  rows: RecoveryRunRow[]
  hasCachedData: boolean
  search: string
  onSearchChange: (search: string) => void
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  showEntityType: boolean
  isLoading: boolean
  error: Error | null
  isRetrying: boolean
  onRetry: () => void
  onSelectEntity: (entityType: RecoveryRunRow['entityType'], entityId: string) => void
  selectedEntityKey: string | null
}

export function RecoveryRunsTable({
  rows,
  hasCachedData,
  search,
  onSearchChange,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  showEntityType,
  isLoading,
  error,
  isRetrying,
  onRetry,
  onSelectEntity,
  selectedEntityKey,
}: RecoveryRunsTableProps) {
  const { t } = useTranslation()
  const errorDetail = extractBackendErrorDetail(error)

  if (isLoading) {
    return <DataTableSkeleton columnCount={showEntityType ? 5 : 4} ariaLabel={t('recoveryRuns.loading')} className="flex-1 rounded-none border-0 shadow-none lg:min-h-0" />
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <DataTableToolbar
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={t('recoveryRuns.search.placeholder')}
        searchLabel={t('recoveryRuns.search.label')}
      />

      <div className="custom-scrollbar flex min-h-[120px] flex-1 flex-col lg:overflow-y-auto">
        <DataTableRequestState
          hasCachedData={hasCachedData}
          error={error ? {
            title: t('recoveryRuns.loadFailed'),
            ...(errorDetail ? { description: errorDetail } : {}),
            retryLabel: t('buttons.retry'),
            isRetrying,
            onRetry,
          } : null}
        >
          <DataTable
            columns={getColumns(t, showEntityType, onRetry)}
            rows={rows}
            rowKey={row => `${row.entityType}:${row.id}`}
            ariaLabel={t('recoveryRuns.tableLabel')}
            rowAriaLabel={row => row.name}
            onRowClick={row => { onSelectEntity(row.entityType, row.id) }}
            selectedRowKey={selectedEntityKey}
            emptyContent={search.trim() ? t('recoveryRuns.noMatches') : t('recoveryRuns.empty')}
          />
        </DataTableRequestState>
      </div>

      {(!error || hasCachedData) ? (
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}
    </div>
  )
}
