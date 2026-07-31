import { useMemo, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { DataTable, DataTablePagination } from '@/shared/components/data-table'
import type { TableDensity } from '@/shared/components/data-table'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { useTranslation } from '@/hooks/useTranslation'
import type { FlashSystemVolumeResource } from '../../model/discoveryTypes'
import { createFlashSystemColumns } from '../config/flashSystemColumns'
import { filterFlashSystemResources, getFlashSystemFilterOptions } from '../helpers/filterSourceResources'
import type { FlashSystemFilters } from '../model/sourceInventoryTypes'
import { FlashSystemVolumeDetailPanel } from './FlashSystemVolumeDetailPanel'
import { SourceInventoryToolbar } from './SourceInventoryToolbar'

type Translate = ReturnType<typeof useTranslation>['t']

const initialFilters: FlashSystemFilters = {
  search: '',
  providerId: '',
  poolId: '',
  hostId: '',
  status: '',
}

interface FlashSystemInventoryViewProps {
  resources: FlashSystemVolumeResource[]
  providers: ProviderRecord[]
  t: Translate
}

export function FlashSystemInventoryView({ resources, providers, t }: FlashSystemInventoryViewProps) {
  const [filters, setFilters] = useState(initialFilters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [density, setDensity] = useState<TableDensity>('compact')
  const [selected, setSelected] = useState<FlashSystemVolumeResource | null>(null)
  const options = useMemo(() => getFlashSystemFilterOptions(resources), [resources])
  const filtered = useMemo(() => filterFlashSystemResources(resources, filters), [filters, resources])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const updateFilters = (next: Partial<FlashSystemFilters>) => {
    setFilters((current) => ({ ...current, ...next }))
    setPage(1)
  }
  const labels = {
    name: t('resources.flash.table.name'),
    status: t('resources.flash.table.status'),
    capacity: t('resources.flash.table.capacity'),
    pool: t('resources.flash.table.pool'),
    ioGroup: t('resources.flash.table.ioGroup'),
    type: t('resources.flash.table.type'),
    protocol: t('resources.flash.table.protocol'),
    hosts: t('resources.flash.table.hosts'),
    copies: t('resources.flash.table.copies'),
    flashCopy: t('resources.flash.table.flashCopy'),
    provider: t('resources.common.provider'),
  }

  return (
    <>
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#dbe7f2] bg-white shadow-sm lg:min-h-0" aria-label={t('resources.flash.tableLabel')}>
        <SourceInventoryToolbar
          search={filters.search}
          searchPlaceholder={t('resources.flash.searchPlaceholder')}
          searchLabel={t('resources.flash.searchLabel')}
          controls={[
            { id: 'providerId', label: t('resources.common.provider'), value: filters.providerId, allLabel: t('resources.common.allProviders'), options: providers.map((provider) => ({ value: provider.id, label: provider.name })) },
            { id: 'poolId', label: t('resources.flash.filters.pool'), value: filters.poolId, allLabel: t('resources.flash.filters.allPools'), options: options.pools.map((pool) => ({ value: pool.id, label: pool.name })) },
            { id: 'hostId', label: t('resources.flash.filters.host'), value: filters.hostId, allLabel: t('resources.flash.filters.allHosts'), options: options.hosts.map((host) => ({ value: host.id, label: host.name })) },
            { id: 'status', label: t('resources.flash.filters.status'), value: filters.status, allLabel: t('resources.flash.filters.allStatuses'), options: options.statuses.map((status) => ({ value: status, label: status })) },
          ]}
          onSearchChange={(search) => { updateFilters({ search }) }}
          onFiltersChange={(next) => { updateFilters(next) }}
          onReset={() => { setFilters(initialFilters); setPage(1) }}
          filterTitle={t('resources.flash.filters.title')}
          filterLabel={t('common.filters')}
          density={density}
          onDensityChange={setDensity}
          labels={{ cancel: t('buttons.cancel'), clear: t('buttons.clearAll'), apply: t('buttons.apply') }}
        />
        <div className="custom-scrollbar flex-1 lg:min-h-0 lg:overflow-y-auto">
          <DataTable
            columns={createFlashSystemColumns(labels)}
            rows={rows}
            rowKey={(row) => row.resourceId}
            density={density}
            selectedRowKey={selected?.resourceId ?? null}
            onRowClick={setSelected}
            rowAriaLabel={(row) => `${t('resources.common.showDetails')} ${row.name}`}
            ariaLabel={t('resources.flash.tableLabel')}
            minWidthClassName="min-w-[1180px]"
            emptyContent={<EmptyState title={t('resources.flash.empty.title')} description={t('resources.flash.empty.description')} action={<Button size="sm" variant="outline" onClick={() => { setFilters(initialFilters) }}>{t('pages.virtualMachines.empty.clearFilters')}</Button>} />}
          />
        </div>
        <DataTablePagination page={safePage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} />
      </section>
      <FlashSystemVolumeDetailPanel
        volume={selected}
        open={selected !== null}
        onClose={() => { setSelected(null) }}
        labels={{
          selected: t('resources.flash.detail.selected'), detail: t('resources.flash.detail.ariaLabel'), close: t('resources.flash.detail.close'),
          pool: t('resources.flash.detail.pool'), name: labels.name, capacity: labels.capacity, usedCapacity: t('resources.flash.detail.used'),
          freeCapacity: t('resources.flash.detail.free'), hostMappings: t('resources.flash.detail.hostMappings'), host: t('resources.flash.filters.host'),
          cluster: t('resources.flash.detail.cluster'), noMappings: t('resources.flash.detail.noMappings'), provider: labels.provider,
        }}
      />
    </>
  )
}
