import { useMemo, useState } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import { Field, Select } from '@/shared/components/form/FormControls'
import {
  DataTable,
  DataTableToolbar,
  DataTablePagination,
  DetailDrawer,
  DetailRow,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { useProviders } from '../api/useProviders'
import type { ProviderRecord } from '@/features/api/providersApi'

const columns: ColumnDef<ProviderRecord>[] = [
  {
    id: 'name',
    header: 'Provider',
    cell: (provider) => (
      <>
        <span className="block font-semibold text-[#17233d]">{provider.name}</span>
        <span className="mt-0.5 block font-mono text-[11px] text-[#93a0b5]">{provider.id}</span>
      </>
    ),
  },
  {
    id: 'description',
    header: 'Description',
    cell: (provider) => <span className="block max-w-md truncate" title={provider.description}>{provider.description || '-'}</span>,
  },
  {
    id: 'type',
    header: 'Type',
    cell: (provider) => <Badge color="info" size="sm">{provider.type || 'UNKNOWN'}</Badge>,
  },
  {
    id: 'ipAddress',
    header: 'IP address',
    cell: (provider) => <span className="font-mono text-[12px] text-[#3b4763]">{provider.ipAddress || '-'}</span>,
  },
]

export function ProvidersCatalogueTable() {
  const { data: providers, isLoading, error } = useProviders()
  const [typeFilter, setTypeFilter] = useState('')
  const [pendingType, setPendingType] = useState('')
  const [selected, setSelected] = useState<ProviderRecord | null>(null)

  const rows = useMemo(() => providers ?? [], [providers])
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
    return <div className="p-6 text-sm text-[#71819a]">Loading providers…</div>
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
              {types.map((type) => <option key={type} value={type}>{type}</option>)}
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
        onRowClick={(provider) => { setSelected(provider) }}
        selectedRowKey={selected?.id ?? null}
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
        onClose={() => { setSelected(null) }}
        eyebrow="Selected provider"
        title={selected?.name ?? ''}
        subtitle={<span className="font-mono">{selected?.id}</span>}
        headerExtra={selected ? <Badge color="info" size="sm">{selected.type || 'UNKNOWN'}</Badge> : null}
        ariaLabel="Provider detail"
      >
        {selected ? (
          <dl className="px-5 py-2">
            <DetailRow label="Provider ID" value={<span className="font-mono">{selected.id}</span>} />
            <DetailRow label="Type" value={selected.type || '-'} />
            <DetailRow label="IP address" value={<span className="font-mono">{selected.ipAddress || '-'}</span>} />
            <DetailRow label="Description" value={selected.description || '-'} />
          </dl>
        ) : null}
      </DetailDrawer>
    </div>
  )
}
