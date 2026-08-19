import { useTranslation } from '@/hooks/useTranslation'
import { Badge } from '@/shared/components/badge/Badge'
import {
  DataTable,
  DataTablePagination,
  DataTableRequestState,
  DataTableSkeleton,
  DataTableToolbar,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { formatRunDuration, formatRunTimestamp, runStatusBadgeColor } from '../helpers/formatRecoveryRun'
import type { OrchestratedEntity, OrchestratorRun } from '../model/recoveryRunTypes'

export interface RecoveryRunRow {
  id: string
  name: string
  entityType: OrchestratedEntity['entityType']
  dagId: string
  latestRun: OrchestratorRun | null
}

function getColumns(t: ReturnType<typeof useTranslation>['t'], showEntityType: boolean): ColumnDef<RecoveryRunRow>[] {
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
      cell: row => row.latestRun ? (
        <Badge color={runStatusBadgeColor(row.latestRun.status)} size="sm">{row.latestRun.status}</Badge>
      ) : (
        <span className="text-text-subtle">{t('recoveryRuns.table.noRuns')}</span>
      ),
    },
    {
      id: 'started',
      header: t('recoveryRuns.table.started'),
      cell: row => <span className="font-mono text-xs">{formatRunTimestamp(row.latestRun?.startedAt ?? null)}</span>,
    },
    {
      id: 'duration',
      header: t('recoveryRuns.table.duration'),
      align: 'right',
      cell: row => <span className="font-mono text-xs tabular-nums">{formatRunDuration(row.latestRun?.durationSeconds ?? null)}</span>,
    },
  )

  return columns
}

interface RecoveryRunsTableProps {
  rows: RecoveryRunRow[]
  showEntityType: boolean
  isLoading: boolean
  error: Error | null
  isRetrying: boolean
  onRetry: () => void
  onSelectEntity: (entityId: string) => void
  selectedEntityId: string | null
}

export function RecoveryRunsTable({
  rows,
  showEntityType,
  isLoading,
  error,
  isRetrying,
  onRetry,
  onSelectEntity,
  selectedEntityId,
}: RecoveryRunsTableProps) {
  const { t } = useTranslation()
  const table = useTableState(rows, { searchFields: ['name', 'id'] })

  if (isLoading) {
    return <DataTableSkeleton columnCount={showEntityType ? 5 : 4} ariaLabel={t('recoveryRuns.loading')} className="flex-1 rounded-none border-0 shadow-none lg:min-h-0" />
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('recoveryRuns.search.placeholder')}
        searchLabel={t('recoveryRuns.search.label')}
      />

      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col lg:overflow-y-auto">
        <DataTableRequestState
          error={error ? {
            title: t('recoveryRuns.loadFailed'),
            retryLabel: t('buttons.retry'),
            isRetrying,
            onRetry,
          } : null}
        >
          <DataTable
            columns={getColumns(t, showEntityType)}
            rows={table.pageItems}
            rowKey={row => row.id}
            ariaLabel={t('recoveryRuns.tableLabel')}
            rowAriaLabel={row => row.name}
            onRowClick={row => { onSelectEntity(row.id) }}
            selectedRowKey={selectedEntityId}
            emptyContent={rows.length > 0 ? t('recoveryRuns.noMatches') : t('recoveryRuns.empty')}
          />
        </DataTableRequestState>
      </div>

      {!error ? (
        <DataTablePagination
          page={table.page}
          pageSize={table.pageSize}
          total={table.total}
          onPageChange={table.setPage}
          onPageSizeChange={table.setPageSize}
        />
      ) : null}
    </div>
  )
}
