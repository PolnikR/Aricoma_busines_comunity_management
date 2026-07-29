import { useMemo, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import {
  DataTable,
  DataTablePagination,
  DataTableSkeleton,
  DataTableToolbar,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { useTranslation } from '@/hooks/useTranslation'
import { useCredentials } from '../api/useCredentials'
import { useDeleteCredential } from '../api/useDeleteCredential'
import type { CredentialRecord } from '../model/credentialTypes'

export function CredentialsTable() {
  const { t } = useTranslation()
  const { data, isLoading, error } = useCredentials()
  const deleteCredential = useDeleteCredential()
  const [deleteTarget, setDeleteTarget] = useState<CredentialRecord | null>(null)
  const rows = useMemo(() => data ?? [], [data])
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
    {
      id: 'actions',
      header: t('credentials.table.actions'),
      cell: credential => (
        <Button
          size="sm"
          variant="danger"
          onClick={(event) => {
            event.stopPropagation()
            setDeleteTarget(credential)
          }}
        >
          {t('buttons.delete')}
        </Button>
      ),
    },
  ]

  if (isLoading) {
    return (
      <DataTableSkeleton
        columnCount={4}
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
        emptyContent={rows.length > 0 ? t('credentials.noMatches') : t('credentials.empty')}
      />
      <DataTablePagination
        page={table.page}
        pageSize={table.pageSize}
        total={table.total}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
      />
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
            onSuccess: () => { setDeleteTarget(null) },
          })
        }}
      />
    </div>
  )
}
