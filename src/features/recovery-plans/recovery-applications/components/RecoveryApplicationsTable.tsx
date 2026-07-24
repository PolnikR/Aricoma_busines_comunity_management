import { useMemo, useState } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import {
  DataTable,
  DataTableToolbar,
  DataTablePagination,
  DetailDrawer,
  DetailRow,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import type { RecoveryApplication } from '../model/recoveryApplicationTypes'

interface RecoveryApplicationsTableProps {
  applications: RecoveryApplication[]
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

function getApplicationStatus(app: RecoveryApplication): 'Active' | 'Draft' {
  const tiers = Object.keys(app.data.application.tiers)
  return tiers.length > 0 ? 'Active' : 'Draft'
}

function getStatusBadgeColor(status: 'Active' | 'Draft'): 'success' | 'warning' {
  return status === 'Active' ? 'success' : 'warning'
}

function getProviderLabel(platform: string): string {
  if (platform.startsWith('VMware')) return 'VMware'
  if (platform.startsWith('IBM')) return 'IBM PowerVM'
  return platform || '—'
}

function getSubmissionBadgeColor(status: string): 'success' | 'error' {
  return status === 'ok' ? 'success' : 'error'
}

const baseColumns: ColumnDef<RecoveryApplication>[] = [
  {
    id: 'name',
    header: 'Application',
    cell: (app) => (
      <>
        <span className="block font-semibold text-[#17233d]">{app.data.application.name}</span>
        <span className="mt-0.5 block text-[11px] text-[#93a0b5]">{app.data.application.description}</span>
      </>
    ),
  },
  {
    id: 'environment',
    header: 'Environment',
    cell: (app) => <Badge color="info" size="sm">{app.data.application.environment}</Badge>,
  },
  {
    id: 'platform',
    header: 'Platform',
    cell: (app) => <span className="text-[13px] text-[#3b4763]">{getProviderLabel(app.data.application.platform)}</span>,
  },
  {
    id: 'tiers',
    header: 'Tiers',
    cell: (app) => <span className="text-[13px] text-[#3b4763] text-right">{Object.keys(app.data.application.tiers).length}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    cell: (app) => {
      const status = getApplicationStatus(app)
      return <Badge color={getStatusBadgeColor(status)} size="sm">{status}</Badge>
    },
  },
  {
    id: 'submission',
    header: 'Submission',
    cell: (app) => {
      if (!app.submission) return <span className="text-[#9aa7bd]">—</span>
      return <Badge color={getSubmissionBadgeColor(app.submission.status)} size="sm">{app.submission.status}</Badge>
    },
  },
]

interface JsonViewerModalProps {
  isOpen: boolean
  app: RecoveryApplication | null
  onClose: () => void
}

function JsonViewerModal({ isOpen, app, onClose }: JsonViewerModalProps) {
  if (!isOpen || !app) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 max-h-96 overflow-hidden rounded-2xl bg-white shadow-lg flex flex-col">
        <div className="border-b border-[#e3edf6] px-6 py-4">
          <h2 className="text-base font-semibold text-[#17233d]">Application JSON</h2>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#f8fbfe] px-6 py-4">
          <pre className="text-xs font-mono text-[#3b4763] whitespace-pre-wrap break-word">
            {JSON.stringify(app.data, null, 2)}
          </pre>
        </div>
        <div className="border-t border-[#e3edf6] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-[#0d91d7] text-white text-sm font-semibold rounded-md hover:bg-[#0a7ab5] transition"
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}

export function RecoveryApplicationsTable({ applications, onEdit, onDelete }: RecoveryApplicationsTableProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [jsonViewId, setJsonViewId] = useState<string | null>(null)

  const rows = useMemo(() => applications, [applications])
  const selected = rows.find((app) => app.id === selectedId) ?? null
  const jsonViewed = rows.find((app) => app.id === jsonViewId) ?? null

  const columns = useMemo(() => [
    ...baseColumns,
    {
      id: 'json',
      header: 'JSON',
      cell: (app: RecoveryApplication) => (
        <button
          type="button"
          className="px-3 py-1 bg-[#eef4f9] text-[#0d91d7] text-xs font-semibold rounded hover:bg-[#e3edf6] transition"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation()
            setJsonViewId(app.id)
          }}
        >
          View
        </button>
      ),
    },
  ], [])

  const table = useTableState(rows, {
    searchFields: ['data.application.name'],
  })

  return (
    <div className="flex flex-col">
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Search by application name"
        searchLabel="Search applications"
        density={table.density}
        onDensityChange={table.setDensity}
      />

      <DataTable
        columns={columns}
        rows={table.pageItems}
        rowKey={(app) => app.id}
        density={table.density}
        minWidthClassName="min-w-250"
        ariaLabel="Recovery applications table"
        onRowClick={(app) => { setSelectedId(app.id) }}
        selectedRowKey={selectedId}
        emptyContent={rows.length > 0 ? 'No applications match your search.' : 'No recovery applications defined yet.'}
      />

      <DataTablePagination
        page={table.page}
        pageSize={table.pageSize}
        total={table.total}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
      />

      <DetailDrawer
        open={selected !== null}
        onClose={() => { setSelectedId(null) }}
        resizable
        eyebrow="Recovery Application"
        title={selected?.data.application.name ?? ''}
        ariaLabel="Application detail"
        footer={selected ? (
          <>
            <button
              type="button"
              onClick={() => { onDelete?.(selected.id) }}
              className="flex-1 rounded-lg border border-[#f0c3c3] px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => { onEdit?.(selected.id); setSelectedId(null) }}
              className="flex-1 rounded-lg bg-[#0d91d7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a7bc4]"
            >
              Edit
            </button>
          </>
        ) : null}
      >
        {selected ? (
          <dl className="px-5 py-2 space-y-3">
            <DetailRow label="Description" value={selected.data.application.description || '-'} />
            <DetailRow label="Environment" value={selected.data.application.environment} />
            <DetailRow label="Platform" value={getProviderLabel(selected.data.application.platform)} />
            <DetailRow label="Tiers" value={String(Object.keys(selected.data.application.tiers).length)} />
            <DetailRow
              label="Status"
              value={<Badge color={getStatusBadgeColor(getApplicationStatus(selected))} size="sm">{getApplicationStatus(selected)}</Badge>}
            />
            {selected.submission && (
              <DetailRow
                label="Submission"
                value={
                  <>
                    <Badge color={getSubmissionBadgeColor(selected.submission.status)} size="sm">{selected.submission.status}</Badge>
                    <span className="mt-1 block font-mono text-[11px] text-[#93a0b5]">{selected.submission.remotePath}</span>
                  </>
                }
              />
            )}
          </dl>
        ) : null}
      </DetailDrawer>

      <JsonViewerModal
        isOpen={jsonViewId !== null}
        app={jsonViewed}
        onClose={() => { setJsonViewId(null) }}
      />
    </div>
  )
}
