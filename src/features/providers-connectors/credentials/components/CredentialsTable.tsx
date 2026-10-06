import { useMemo, useState } from 'react'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { Alert } from '@/shared/components/alert/Alert'
import { Button } from '@/shared/components/button/Button'
import {
  DataTable,
  DataTablePagination,
  DataTableRequestState,
  DataTableSurface,
  DataTableToolbar,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { DetailField, DetailFieldGroup, DetailView, DetailViewSection } from '@/shared/components/detail-view'
import { GridIcon } from '@/shared/icons/Icons'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { useTranslation } from '@/hooks/useTranslation'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { useDeleteCredential } from '@/generated/query/credentials/credentials.gen'
import type { CredentialRecordOutput } from '@/generated/query/zod'
import { CredentialCreateModal } from './CredentialCreateModal'

interface CredentialsTableProps {
  credentials: CredentialRecordOutput[]
  isLoading: boolean
  error: Error | null
  isRetrying: boolean
  onRetry: () => void
}

export function CredentialsTable({ credentials, isLoading, error, isRetrying, onRetry }: CredentialsTableProps) {
  const { t } = useTranslation()
  const deleteCredential = useDeleteCredential()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<CredentialRecordOutput | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CredentialRecordOutput | null>(null)
  const loadErrorDescription = extractBackendErrorDetail(error)
  const deleteErrorDescription = extractBackendErrorDetail(deleteCredential.error)
  const rows = useMemo(() => credentials, [credentials])
  const selected = rows.find(credential => credential.id === selectedId) ?? null
  const table = useTableState(rows, { searchFields: ['name', 'username'] })
  const columns: ColumnDef<CredentialRecordOutput>[] = [
    {
      id: 'name',
      header: t('credentials.table.name'),
      cell: credential => (
        <>
          <span className="block font-semibold text-text-primary">{credential.name}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-text-subtle">{credential.id}</span>
        </>
      ),
    },
    {
      id: 'description',
      header: t('credentials.table.description'),
      cell: credential => (
        <span className="block max-w-lg truncate" title={credential.description ?? ''}>
          {credential.description ?? ''}
        </span>
      ),
    },
    {
      id: 'username',
      header: t('credentials.table.username'),
      cell: credential => <span className="font-mono text-xs text-text-secondary">{credential.username}</span>,
    },
  ]

  const toolbar = (
    <>
      {deleteCredential.error ? (
        <Alert
          className="mx-4 mt-4"
          title={t('credentials.delete.title')}
          {...(deleteErrorDescription ? { description: deleteErrorDescription } : {})}
          variant="error"
        />
      ) : null}
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('credentials.searchPlaceholder')}
        searchLabel={t('credentials.searchLabel')}
        density={table.density}
        onDensityChange={table.setDensity}
      />
    </>
  )

  const pagination = !error ? (
    <DataTablePagination
      page={table.page}
      pageSize={table.pageSize}
      total={table.total}
      isLoading={isLoading}
      onPageChange={table.setPage}
      onPageSizeChange={table.setPageSize}
    />
  ) : null

  return (
    <>
      <DataTableSurface
        ariaLabel={t(isLoading ? 'credentials.loading' : 'credentials.table.ariaLabel')}
        toolbar={toolbar}
        pagination={pagination}
      >
      <DataTableRequestState
        hasCachedData={credentials.length > 0}
        error={error ? {
          title: t('credentials.errors.load'),
          ...(loadErrorDescription ? { description: loadErrorDescription } : {}),
          retryLabel: t('buttons.retry'),
          isRetrying,
          onRetry,
        } : null}
      >
        <DataTable
          columns={columns}
          rows={table.pageItems}
          rowKey={credential => credential.id}
          isLoading={isLoading}
          density={table.density}
          minWidthClassName="min-w-190"
          ariaLabel={t(isLoading ? 'credentials.loading' : 'credentials.table.ariaLabel')}
          onRowClick={credential => { setSelectedId(credential.id) }}
          selectedRowKey={selectedId}
          emptyContent={rows.length > 0 ? t('credentials.noMatches') : t('credentials.empty')}
        />
      </DataTableRequestState>
      </DataTableSurface>
      {selected ? (
        <DetailView
          // Keyed by credential so each newly opened credential starts expanded on Overview.
          key={selected.id}
          open
          onClose={() => { setSelectedId(null) }}
          size="md"
          entityLabel={t('drawer.entity.credential')}
          title={selected.name}
          headerActions={<KeyedHelpPopover helpKey="credentials.help" sections={['secret', 'usage']} />}
          ariaLabel={t('credentials.detail.ariaLabel')}
          closeLabel={t('credentials.detail.close')}
          footerStart={(
            <Button
              size="sm"
              variant="danger"
              onClick={() => { setDeleteTarget(selected) }}
            >
              {t('buttons.delete')}
            </Button>
          )}
          footer={(
            <Button
              size="sm"
              onClick={() => {
                setEditing(selected)
                setSelectedId(null)
              }}
            >
              {t('buttons.edit')}
            </Button>
          )}
        >
          {/* One flat Overview in the order of the original detail drawer. */}
          <DetailViewSection id="overview" title={t('details.tabs.overview')} icon={GridIcon}>
            <DetailFieldGroup>
              <DetailField label={t('credentials.detail.id')} value={selected.id} mono copyValue={selected.id} />
              <DetailField label={t('credentials.detail.username')} value={selected.username} mono emphasis />
              <DetailField label={t('credentials.detail.description')} value={selected.description} wide />
              {/* The secret is never sent to the browser; only that it is stored. */}
              <DetailField label={t('credentials.detail.password')} value={t('credentials.detail.passwordHidden')} />
            </DetailFieldGroup>
          </DetailViewSection>
        </DetailView>
      ) : null}
      {editing ? (
        <CredentialCreateModal
          open
          credential={editing}
          existingCredentials={rows}
          onClose={() => { setEditing(null) }}
        />
      ) : null}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('credentials.delete.title')}
        message={t('credentials.delete.message').replace('{name}', deleteTarget?.name ?? '')}
        confirmLabel={t('buttons.delete')}
        cancelLabel={t('buttons.cancel')}
        loadingLabel={t('buttons.deleting')}
        tone="danger"
        isLoading={deleteCredential.isPending}
        onCancel={() => { setDeleteTarget(null) }}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteCredential.mutate({ params: { credential_id: deleteTarget.id } }, {
            onSuccess: () => {
              setDeleteTarget(null)
              setSelectedId(null)
            },
          })
        }}
      />
    </>
  )
}
