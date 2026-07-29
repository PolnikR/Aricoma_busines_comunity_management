import { useMemo, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import {
  DataTable,
  DataTablePagination,
  DataTableSkeleton,
  DataTableToolbar,
  DetailDrawer,
  DetailRow,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { useTranslation } from '@/hooks/useTranslation'
import { useDeleteCredential } from '../hooks/useDeleteCredential'
import type { CredentialRecord } from '../model/credentialTypes'
import { CredentialCreateModal } from './CredentialCreateModal'

interface CredentialsTableProps {
  credentials: CredentialRecord[]
  isLoading: boolean
  error: Error | null
}

export function CredentialsTable({ credentials, isLoading, error }: CredentialsTableProps) {
  const { t } = useTranslation()
  const deleteCredential = useDeleteCredential()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<CredentialRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CredentialRecord | null>(null)
  const rows = useMemo(() => credentials, [credentials])
  const selected = rows.find(credential => credential.id === selectedId) ?? null
  const table = useTableState(rows, { searchFields: ['name', 'username'] })
  const columns: ColumnDef<CredentialRecord>[] = [
    {
      id: 'name',
      header: t('credentials.table.name'),
      cell: credential => (
        <>
          <span className="block font-semibold text-[#17233d]">{credential.name}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-[#93a0b5]">{credential.id}</span>
        </>
      ),
    },
    {
      id: 'description',
      header: t('credentials.table.description'),
      cell: credential => (
        <span className="block max-w-lg truncate" title={credential.description}>
          {credential.description}
        </span>
      ),
    },
    {
      id: 'username',
      header: t('credentials.table.username'),
      cell: credential => <span className="font-mono text-xs text-[#3b4763]">{credential.username}</span>,
    },
  ]

  if (isLoading) {
    return (
      <DataTableSkeleton
        columnCount={3}
        ariaLabel={t('credentials.loading')}
        className="flex-1 rounded-none border-0 shadow-none lg:min-h-0"
      />
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
          {t('credentials.errors.load')} {error instanceof Error ? error.message : ''}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {deleteCredential.error ? (
        <div className="mx-4 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {deleteCredential.error.message}
        </div>
      ) : null}
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('credentials.searchPlaceholder')}
        searchLabel={t('credentials.searchLabel')}
        density={table.density}
        onDensityChange={table.setDensity}
      />
      <DataTable
        columns={columns}
        rows={table.pageItems}
        rowKey={credential => credential.id}
        density={table.density}
        minWidthClassName="min-w-190"
        ariaLabel={t('credentials.table.ariaLabel')}
        onRowClick={credential => { setSelectedId(credential.id) }}
        selectedRowKey={selectedId}
        emptyContent={rows.length > 0 ? t('credentials.noMatches') : t('credentials.empty')}
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
        eyebrow={t('credentials.detail.eyebrow')}
        title={selected?.name ?? ''}
        subtitle={<span className="font-mono">{selected?.id}</span>}
        ariaLabel={t('credentials.detail.ariaLabel')}
        closeLabel={t('credentials.detail.close')}
        footer={selected ? (
          <>
            <Button
              size="sm"
              variant="danger"
              className="flex-1"
              onClick={() => { setDeleteTarget(selected) }}
            >
              {t('buttons.delete')}
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => {
                setEditing(selected)
                setSelectedId(null)
              }}
            >
              {t('buttons.edit')}
            </Button>
          </>
        ) : null}
      >
        {selected ? (
          <dl className="px-5 py-2">
            <DetailRow label={t('credentials.detail.id')} value={<span className="font-mono">{selected.id}</span>} />
            <DetailRow label={t('credentials.detail.username')} value={<span className="font-mono">{selected.username}</span>} />
            <DetailRow label={t('credentials.detail.description')} value={selected.description} />
            <DetailRow label={t('credentials.detail.password')} value={t('credentials.detail.passwordHidden')} />
          </dl>
        ) : null}
      </DetailDrawer>
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
          deleteCredential.mutate(deleteTarget.id, {
            onSuccess: () => {
              setDeleteTarget(null)
              setSelectedId(null)
            },
          })
        }}
      />
    </div>
  )
}
