import { useMemo, useState } from 'react'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import {
  DataTable,
  DataTablePagination,
  DataTableRequestState,
} from '@/shared/components/data-table'
import type { ColumnDef, TableDensity } from '@/shared/components/data-table'
import { normalizeAccessLogFilters } from '../api/accessLogQueryKeys'
import { useAccessLogs } from '../hooks/useAccessLogs'
import type { AccessLogFilters, AccessLogRecord } from '../model/accessLogTypes'
import { AccessLogDetailDrawer } from './AccessLogDetailDrawer'

const INITIAL_PAGE_SIZE = 10

interface AccessLogTableRow {
  key: string
  record: AccessLogRecord
}

interface AccessLogsTableProps {
  filters: AccessLogFilters
  density: TableDensity
}

function formatDuration(durationMs: number) {
  return `${String(durationMs)} ms`
}

function rowAriaLabel(record: AccessLogRecord) {
  return record.kind === 'request' ? `${record.method} ${record.path}` : 'Raw access log entry'
}

const columns: ColumnDef<AccessLogTableRow>[] = [
  {
    id: 'method',
    header: 'Method',
    cell: ({ record }) => record.kind === 'request'
      ? <span className="font-mono font-medium text-text-primary">{record.method}</span>
      : '—',
  },
  {
    id: 'path',
    header: 'Path',
    cell: ({ record }) => record.kind === 'request'
      ? <span className="block max-w-xl truncate font-mono" title={record.path}>{record.path}</span>
      : <span className="text-text-muted">Raw access-log entry</span>,
  },
  {
    id: 'status',
    header: 'Status',
    align: 'right',
    cell: ({ record }) => record.kind === 'request' ? String(record.status) : '—',
  },
  {
    id: 'duration',
    header: 'Duration',
    align: 'right',
    cell: ({ record }) => record.kind === 'request' ? formatDuration(record.durationMs) : '—',
  },
]

export function AccessLogsTable({ filters, density }: AccessLogsTableProps) {
  const { data = [], error, isLoading, isFetching, refetch } = useAccessLogs(filters)
  const appliedQueryKey = JSON.stringify(normalizeAccessLogFilters(filters))

  return (
    <AccessLogsTableView
      key={appliedQueryKey}
      data={data}
      density={density}
      error={error}
      isFetching={isFetching}
      isLoading={isLoading}
      refetch={refetch}
    />
  )
}

interface AccessLogsTableViewProps {
  data: AccessLogRecord[]
  density: TableDensity
  error: Error | null
  isFetching: boolean
  isLoading: boolean
  refetch: () => Promise<unknown>
}

function AccessLogsTableView({ data, density, error, isFetching, isLoading, refetch }: AccessLogsTableViewProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(INITIAL_PAGE_SIZE)
  const [selectedRow, setSelectedRow] = useState<AccessLogTableRow | null>(null)
  const pageCount = Math.max(1, Math.ceil(data.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const startIndex = (currentPage - 1) * pageSize
  const pageRows = useMemo(() => data.slice(startIndex, startIndex + pageSize).map((record, index) => ({
    key: String(startIndex + index),
    record,
  })), [data, pageSize, startIndex])
  const errorDetail = extractBackendErrorDetail(error)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="custom-scrollbar flex min-h-[120px] flex-1 flex-col lg:overflow-y-auto">
        <DataTableRequestState
          hasCachedData={data.length > 0}
          error={error ? {
            title: data.length > 0 ? 'Access logs could not be refreshed.' : 'Access logs could not be loaded.',
            ...(errorDetail ? { description: errorDetail } : {}),
            retryLabel: 'Retry',
            isRetrying: isFetching,
            onRetry: () => { void refetch() },
          } : null}
        >
          <DataTable
            columns={columns}
            rows={pageRows}
            rowKey={row => row.key}
            rowAriaLabel={row => rowAriaLabel(row.record)}
            density={density}
            isLoading={isLoading}
            ariaLabel={isLoading ? 'Loading access logs' : 'Access logs'}
            onRowClick={setSelectedRow}
            selectedRowKey={selectedRow?.key}
            emptyContent="No access logs found."
          />
        </DataTableRequestState>
      </div>

      {(!error || data.length > 0) ? (
        <DataTablePagination
          page={currentPage}
          pageSize={pageSize}
          total={data.length}
          isLoading={isLoading}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => { setPageSize(nextPageSize); setPage(1) }}
        />
      ) : null}

      <AccessLogDetailDrawer record={selectedRow?.record ?? null} onClose={() => { setSelectedRow(null) }} />
    </div>
  )
}
