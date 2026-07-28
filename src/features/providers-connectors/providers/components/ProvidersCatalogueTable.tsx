import { useMemo, useState } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { Field, Select } from '@/shared/components/form/FormControls'
import {
  DataTable,
  DataTableSkeleton,
  DataTableToolbar,
  DataTablePagination,
  DetailDrawer,
  DetailRow,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { useTranslation } from '@/hooks/useTranslation'
import { useProviders } from '../api/useProviders'
import { useDeleteProvider } from '../api/useDeleteProvider'
import { ProvidersCreateModal } from './ProvidersCreateModal'
import { providerTypeLabel } from '../helpers/providerTypeLabel'
import type { ProviderRecord } from '../model/providerTypes'

function getColumns(t: ReturnType<typeof useTranslation>['t']): ColumnDef<ProviderRecord>[] {
  return [
    {
      id: 'name',
      header: t('tables.provider.name'),
      cell: (provider) => (
        <>
          <span className="block font-semibold text-[#17233d]">{provider.name}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-[#93a0b5]">{provider.id}</span>
        </>
      ),
    },
    {
      id: 'description',
      header: t('tables.provider.description'),
      cell: (provider) => <span className="block max-w-md truncate" title={provider.description}>{provider.description || '-'}</span>,
    },
    {
      id: 'type',
      header: t('tables.provider.type'),
      cell: (provider) => <Badge color="info" size="sm">{provider.type ? providerTypeLabel(provider.type) : 'UNKNOWN'}</Badge>,
    },
    {
      id: 'ipAddress',
      header: t('tables.provider.ip'),
      cell: (provider) => <span className="font-mono text-[12px] text-[#3b4763]">{provider.ipAddress || '-'}</span>,
    },
  ]
}

export function ProvidersCatalogueTable() {
  const { t } = useTranslation()
  const columns = getColumns(t)
  const { data: providers, isLoading, error } = useProviders()
  const deleteProvider = useDeleteProvider()
  const [typeFilter, setTypeFilter] = useState('')
  const [pendingType, setPendingType] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<ProviderRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProviderRecord | null>(null)

  const rows = useMemo(() => providers ?? [], [providers])
  const selected = rows.find((provider) => provider.id === selectedId) ?? null
  const types = useMemo(
    () => [...new Set(rows.map((provider) => provider.type).filter(Boolean))].sort(),
    [rows],
  )

  const table = useTableState(rows, {
    searchFields: ['name'],
    predicate: (provider) => !typeFilter || provider.type === typeFilter,
  })

  const changeType = (value: string) => { setTypeFilter(value); setPendingType(value); table.setPage(1) }

  if (isLoading) {
    return (
      <DataTableSkeleton
        columnCount={4}
        ariaLabel="Loading providers"
        className="flex-1 rounded-none border-0 shadow-none lg:min-h-0"
      />
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          Failed to load providers. {error instanceof Error ? error.message : ''}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Search by provider name"
        searchLabel="Search providers by name"
        density={table.density}
        onDensityChange={table.setDensity}
        filterTitle="Filter providers"
        activeFilterCount={typeFilter ? 1 : 0}
        onApplyFilters={() => { changeType(pendingType) }}
        onClearFilters={() => { setPendingType(''); changeType('') }}
        filterPanel={
          <Field label="Type" htmlFor="provider-type-filter">
            <Select id="provider-type-filter" value={pendingType} onChange={(event) => { setPendingType(event.target.value) }}>
              <option value="">All types</option>
              {types.map((type) => <option key={type} value={type}>{providerTypeLabel(type)}</option>)}
            </Select>
          </Field>
        }
      />

      <DataTable
        columns={columns}
        rows={table.pageItems}
        rowKey={(provider) => provider.id}
        density={table.density}
        minWidthClassName="min-w-215"
        ariaLabel="Providers table"
        onRowClick={(provider) => { setSelectedId(provider.id) }}
        selectedRowKey={selectedId}
        emptyContent={rows.length > 0 ? 'No providers match your search.' : 'No providers were returned by the backend.'}
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
        eyebrow={t('drawer.selectedProvider')}
        title={selected?.name ?? ''}
        subtitle={<span className="font-mono">{selected?.id}</span>}
        headerExtra={selected ? <Badge color="info" size="sm">{selected.type ? providerTypeLabel(selected.type) : t('details.unknown')}</Badge> : null}
        ariaLabel={t('drawer.providerDetail')}
        closeLabel={t('drawer.closeProvider')}
        footer={selected ? (
          <>
            <Button
              onClick={() => { setDeleteTarget(selected) }}
              size="sm"
              variant="danger"
              className="flex-1"
            >
              {t('buttons.delete')}
            </Button>
            <Button
              onClick={() => { setEditing(selected); setSelectedId(null) }}
              size="sm"
              className="flex-1"
            >
              {t('buttons.edit')}
            </Button>
          </>
        ) : null}
      >
        {selected ? (
          <dl className="px-5 py-2">
            <DetailRow label={t('details.providerId')} value={<span className="font-mono">{selected.id}</span>} />
            <DetailRow label={t('details.type')} value={selected.type ? providerTypeLabel(selected.type) : '-'} />
            <DetailRow label={t('details.ipAddress')} value={<span className="font-mono">{selected.ipAddress || '-'}</span>} />
            <DetailRow label={t('details.description')} value={selected.description || '-'} />
          </dl>
        ) : null}
      </DetailDrawer>

      {editing ? (
        <ProvidersCreateModal
          open
          onClose={() => { setEditing(null) }}
          existingProviders={rows}
          provider={editing}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('dialogs.deleteProvider')}
        message={t('dialogs.deleteProviderMessage').replace('{name}', deleteTarget?.name ?? '')}
        confirmLabel={t('buttons.delete')}
        cancelLabel={t('buttons.cancel')}
        loadingLabel={t('buttons.deleting')}
        tone="danger"
        isLoading={deleteProvider.isPending}
        onCancel={() => { setDeleteTarget(null) }}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteProvider.mutate(deleteTarget.id, {
            onSuccess: () => { setDeleteTarget(null); setSelectedId(null) },
          })
        }}
      />
    </div>
  )
}
