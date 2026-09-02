import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import {
  DataTable,
  DataTablePagination,
  StateCell,
} from '@/shared/components/data-table'
import type { ColumnDef, StateTone, TableDensity } from '@/shared/components/data-table'
import { InventoryPanel } from '@/shared/components/inventory-shell/InventoryPanel'
import { normalizeAccessLogFilters } from '../api/accessLogQueryKeys'
import { useAccessLogs } from '../hooks/useAccessLogs'
import type { AccessLogFilters, AccessLogRecord } from '../model/accessLogTypes'
import { AccessLogDetailDrawer } from './AccessLogDetailDrawer'

const INITIAL_PAGE_SIZE = 25

interface AccessLogTableRow {
  key: string
  record: AccessLogRecord
}

interface AccessLogsTableProps {
  filters: AccessLogFilters
  density: TableDensity
  toolbar?: ReactNode
  resetKey?: number
}

function formatDuration(durationMs: number) {
  return `${String(durationMs)} ms`
}

function statusTone(status: number): StateTone {
  if (status >= 500) return 'error'
  if (status >= 400) return 'warn'
  if (status >= 300) return 'off'
  return 'on'
}

function rowAriaLabel(record: AccessLogRecord, rawEntryLabel: string) {
  return record.kind === 'request' ? `${record.method} ${record.path}` : rawEntryLabel
}

function createColumns(t: (key: string) => string): ColumnDef<AccessLogTableRow>[] {
  return [
    {
      id: 'method',
      header: t('audit.accessLogs.table.columns.method'),
      cell: ({ record }) => record.kind === 'request'
        ? <span className="font-mono font-medium text-text-primary">{record.method}</span>
        : '—',
    },
    {
      id: 'path',
      header: t('audit.accessLogs.table.columns.path'),
      cell: ({ record }) => record.kind === 'request'
        ? <span className="block max-w-xl truncate font-mono" title={record.path}>{record.path}</span>
        : <span className="text-text-muted">{t('audit.accessLogs.table.rawEntry')}</span>,
    },
    {
      id: 'status',
      header: t('audit.accessLogs.table.columns.status'),
      cell: ({ record }) => record.kind === 'request'
        ? <StateCell tone={statusTone(record.status)} label={String(record.status)} />
        : '—',
    },
    {
      id: 'duration',
      header: t('audit.accessLogs.table.columns.duration'),
      align: 'right',
      cell: ({ record }) => record.kind === 'request' ? formatDuration(record.durationMs) : '—',
    },
  ]
}

export function AccessLogsTable({ filters, density, toolbar, resetKey = 0 }: AccessLogsTableProps) {
  const { t } = useTranslation()
  const { data = [], dataUpdatedAt, error, isLoading, isFetching, refetch } = useAccessLogs(filters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(INITIAL_PAGE_SIZE)
  const [selection, setSelection] = useState<{ dataUpdatedAt: number, row: AccessLogTableRow } | null>(null)
  const appliedQuery = `${JSON.stringify(normalizeAccessLogFilters(filters))}#${String(resetKey)}`
  const [renderedQuery, setRenderedQuery] = useState(appliedQuery)

  if (renderedQuery !== appliedQuery) {
    setRenderedQuery(appliedQuery)
    setPage(1)
    setPageSize(INITIAL_PAGE_SIZE)
    setSelection(null)
  }

  const selectedRow = selection?.dataUpdatedAt === dataUpdatedAt ? selection.row : null
  const pageCount = Math.max(1, Math.ceil(data.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const startIndex = (currentPage - 1) * pageSize
  const pageRows = useMemo(() => data.slice(startIndex, startIndex + pageSize).map((record, index) => ({
    key: String(startIndex + index),
    record,
  })), [data, pageSize, startIndex])
  const errorDetail = extractBackendErrorDetail(error)
  const columns = useMemo(() => createColumns(t), [t])

  return (
    <>
      <InventoryPanel
        ariaLabel={t('audit.accessLogs.table.ariaLabel')}
        toolbar={toolbar}
        hasCachedData={data.length > 0}
        error={error ? {
          title: data.length > 0 ? t('audit.accessLogs.error.refresh') : t('audit.accessLogs.error.load'),
          ...(errorDetail ? { description: errorDetail } : {}),
          retryLabel: t('audit.accessLogs.error.retry'),
          isRetrying: isFetching,
          onRetry: () => { void refetch() },
        } : null}
        pagination={(
          <DataTablePagination
            page={currentPage}
            pageSize={pageSize}
            total={data.length}
            isLoading={isLoading}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => { setPageSize(nextPageSize); setPage(1) }}
            paginationAriaLabel={t('audit.accessLogs.table.ariaLabel')}
            rowsPerPageLabel={t('pagination.rowsPerPage')}
            previousPageLabel={t('pagination.previousPage')}
            nextPageLabel={t('pagination.nextPage')}
            pageOfLabel={t('pagination.pageOf')}
            pageLabel={t('pagination.page')}
          />
        )}
      >
        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={row => row.key}
          rowAriaLabel={row => rowAriaLabel(row.record, t('audit.accessLogs.table.rawEntry'))}
          density={density}
          isLoading={isLoading}
          ariaLabel={isLoading ? t('audit.accessLogs.table.loading') : t('audit.accessLogs.table.ariaLabel')}
          onRowClick={(row) => { setSelection({ dataUpdatedAt, row }) }}
          selectedRowKey={selectedRow?.key ?? null}
          emptyContent={t('audit.accessLogs.table.empty')}
          headerCellClassName="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-subtle"
          cellClassName={`px-3 ${density === 'compact' ? 'py-1.5' : 'py-2.5'} text-[13px] text-text-secondary align-top`}
        />
      </InventoryPanel>

      <AccessLogDetailDrawer record={selectedRow?.record ?? null} onClose={() => { setSelection(null) }} />
    </>
  )
}
