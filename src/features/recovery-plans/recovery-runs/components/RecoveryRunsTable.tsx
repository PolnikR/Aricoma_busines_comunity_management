import { useTranslation } from '@/hooks/useTranslation'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { Badge } from '@/shared/components/badge/Badge'
import { Input } from '@/shared/components/form/FormControls'
import { SearchIcon } from '@/shared/icons/Icons'
import {
  DataTable,
  DataTableSurface,
  DataTablePagination,
  DataTableRequestState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { formatRunDuration, formatRunTimestamp, runStatusBadgeColor } from '../helpers/formatRecoveryRun'
import type { LatestRunRequestState, OrchestratedEntity } from '../model/recoveryRunTypes'

export interface RecoveryRunRow {
  id: string
  name: string
  entityType: OrchestratedEntity['entityType']
  dagId: string
  providerId: string
  latestRunState: LatestRunRequestState
}

function getColumns(
  t: ReturnType<typeof useTranslation>['t'],
  showEntityType: boolean,
  onRetry: (row?: RecoveryRunRow) => void,
): ColumnDef<RecoveryRunRow>[] {
  const columns: ColumnDef<RecoveryRunRow>[] = [
    {
      id: 'app',
      header: t('recoveryRuns.table.application'),
      cell: row => (
        <>
          <span className="block font-semibold leading-4 text-text-primary">{row.name}</span>
          <span className="block font-mono text-[11px] leading-3 text-text-muted">{row.id}</span>
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
                onClick={(event) => { event.stopPropagation(); onRetry(row) }}
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
  onRetry: (row?: RecoveryRunRow) => void
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

  const toolbar = (
    <div className="shrink-0 border-b border-border pb-2">
      <Input
        size="sm"
        type="search"
        className="sm:w-72"
        value={search}
        onChange={event => { onSearchChange(event.target.value) }}
        placeholder={t('recoveryRuns.search.placeholder')}
        aria-label={t('recoveryRuns.search.label')}
        leadingIcon={<SearchIcon className="size-4" />}
      />
    </div>
  )

  const pagination = (!error || hasCachedData) ? (
    <DataTablePagination
      page={page}
      pageSize={pageSize}
      total={total}
      isLoading={isLoading}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  ) : null

  return (
    <DataTableSurface variant="flat" ariaLabel={t('recoveryRuns.tableLabel')} toolbar={toolbar} pagination={pagination}>
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
            layout="contained"
            minWidthClassName="min-w-160 w-full"
            headerCellClassName="whitespace-nowrap px-2 first:pl-0 last:pr-0 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted"
            cellClassName="px-2 first:pl-0 last:pr-0 py-1.5 text-xs text-text-secondary align-middle"
            columns={getColumns(t, showEntityType, onRetry)}
            rows={rows}
            isLoading={isLoading}
            rowKey={row => `${row.entityType}:${row.id}`}
            ariaLabel={isLoading ? t('recoveryRuns.loading') : t('recoveryRuns.tableLabel')}
            rowAriaLabel={row => row.name}
            onRowClick={row => { onSelectEntity(row.entityType, row.id) }}
            selectedRowKey={selectedEntityKey}
            emptyContent={search.trim() ? t('recoveryRuns.noMatches') : t('recoveryRuns.empty')}
          />
        </DataTableRequestState>
    </DataTableSurface>
  )
}
