import { useMemo, useState } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { useTranslation } from '@/hooks/useTranslation'
import {
  DataTable,
  DataTableToolbar,
  DataTablePagination,
  DetailDrawer,
  DetailRow,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { Modal } from '@/shared/components/modal/Modal'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'

interface RecoveryApplicationsTableProps {
  applications: RecoveryApplicationListItem[]
  onEdit?: (id: string) => void
}

function getApplicationStatus(app: RecoveryApplicationListItem): 'Active' | 'Draft' {
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

const baseColumns: ColumnDef<RecoveryApplicationListItem>[] = [
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
  app: RecoveryApplicationListItem | null
  onClose: () => void
}

function JsonViewerModal({ isOpen, app, onClose }: JsonViewerModalProps) {
  const { t } = useTranslation()
  if (!isOpen || !app) return null

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={t('recovery.modal.jsonViewer.title')}
      size="lg"
      className="flex max-h-96 flex-col overflow-hidden"
      footer={
          <Button
            onClick={onClose}
            size="sm"
            fullWidth
          >
            {t('buttons.close')}
          </Button>
      }
    >
      <div className="flex-1 overflow-y-auto bg-[#f8fbfe] px-6 py-4">
        <pre className="text-xs font-mono text-[#3b4763] whitespace-pre-wrap break-word">
          {JSON.stringify(app.data, null, 2)}
        </pre>
      </div>
    </Modal>
  )
}

export function RecoveryApplicationsTable({ applications, onEdit }: RecoveryApplicationsTableProps) {
  const { t } = useTranslation()
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
      cell: (app: RecoveryApplicationListItem) => (
        <Button
          size="xs"
          variant="soft"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation()
            setJsonViewId(app.id)
          }}
        >
          View
        </Button>
      ),
    },
  ], [])

  const table = useTableState(rows, {
    searchFields: ['id'],
  })

  return (
    <div className="flex flex-col">
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('pages.recovery.searchPlaceholder')}
        searchLabel={t('pages.recovery.searchLabel')}
        density={table.density}
        onDensityChange={table.setDensity}
      />

      <DataTable
        columns={columns}
        rows={table.pageItems}
        rowKey={(app) => app.id}
        density={table.density}
        minWidthClassName="min-w-250"
        ariaLabel={t('pages.recovery.tableAriaLabel')}
        onRowClick={(app) => { setSelectedId(app.id) }}
        selectedRowKey={selectedId}
        emptyContent={rows.length > 0 ? t('messages.noResults') : t('pages.recovery.empty.noApplications')}
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
        footer={selected && onEdit ? (
          <Button
            onClick={() => { onEdit(selected.id); setSelectedId(null) }}
            size="sm"
            className="w-full"
          >
            Edit
          </Button>
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
