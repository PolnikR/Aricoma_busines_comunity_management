import { useMemo, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { DataTable, DataTablePagination } from '@/shared/components/data-table'
import type { TableDensity } from '@/shared/components/data-table'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { useTranslation } from '@/hooks/useTranslation'
import type { FlashSystemVolumeResource } from '../../../model/discoveryTypes'
import { createFlashSystemColumns } from '../../config/flashSystemColumns'
import { buildFlashSystemHostSummaries } from '../../helpers/buildFlashSystemHostSummaries'
import { filterFlashSystemResources, getFlashSystemFilterOptions } from '../../helpers/filterSourceResources'
import type { FlashSystemFilters } from '../../model/sourceInventoryTypes'
import { FlashSystemVolumeDetailPanel } from './FlashSystemVolumeDetailPanel'
import { ResourceInventoryPanel, type ResourceInventoryPanelError } from '../ResourceInventoryPanel'
import { SourceInventoryToolbar } from '../SourceInventoryToolbar'

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
  providerId: string
  onProviderIdChange: (providerId: string) => void
  error?: ResourceInventoryPanelError | null
  t: Translate
}

export function FlashSystemInventoryView({
  resources,
  providers,
  providerId,
  onProviderIdChange,
  error,
  t,
}: FlashSystemInventoryViewProps) {
  const [filters, setFilters] = useState<FlashSystemFilters>({ ...initialFilters, providerId })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [density, setDensity] = useState<TableDensity>('compact')
  const [selected, setSelected] = useState<FlashSystemVolumeResource | null>(null)
  const options = useMemo(() => getFlashSystemFilterOptions(resources), [resources])
  const providerNames = useMemo(
    () => new Map(providers.map((provider) => [provider.id, provider.name])),
    [providers],
  )
  const filtered = useMemo(() => filterFlashSystemResources(resources, filters), [filters, resources])
  const hostSummaries = useMemo(() => buildFlashSystemHostSummaries(resources), [resources])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const updateFilters = (next: Partial<FlashSystemFilters>) => {
    if (next.providerId !== undefined && next.providerId !== filters.providerId) {
      onProviderIdChange(next.providerId)
    }
    setFilters((current) => ({ ...current, ...next }))
    setPage(1)
  }
  const labels = {
    name: t('resources.flash.table.name'),
    status: t('resources.flash.table.status'),
    capacity: t('resources.flash.table.capacity'),
    pool: t('resources.flash.table.pool'),
    type: t('resources.flash.table.type'),
    hosts: t('resources.flash.table.hosts'),
    copies: t('resources.flash.table.copies'),
    flashCopy: t('resources.flash.table.flashCopy'),
    provider: t('resources.common.provider'),
  }
  const hostLabels = {
    showDetails: t('resources.flash.hostTooltip.showDetails'),
    hostId: t('resources.flash.hostTooltip.hostId'),
    cluster: t('resources.flash.hostTooltip.cluster'),
    notAssigned: t('resources.flash.hostTooltip.notAssigned'),
    mappedVolumes: t('resources.flash.hostTooltip.mappedVolumes'),
    mappedCapacity: t('resources.flash.hostTooltip.mappedCapacity'),
    unavailable: t('resources.flash.hostTooltip.unavailable'),
    lun: t('resources.flash.hostTooltip.lun'),
    showAdditionalHosts: t('resources.flash.hostTooltip.showAdditionalHosts'),
    additionalHosts: t('resources.flash.hostTooltip.additionalHosts'),
  }

  return (
    <>
      <ResourceInventoryPanel
        ariaLabel={t('resources.flash.tableLabel')}
        error={error ?? null}
        toolbar={<SourceInventoryToolbar
          search={filters.search}
          searchPlaceholder={t('resources.flash.searchPlaceholder')}
          searchLabel={t('resources.flash.searchLabel')}
          controls={[
            { id: 'providerId', label: t('resources.common.provider'), value: filters.providerId, allLabel: t('resources.common.allProviders'), options: providers.map((provider) => ({ value: provider.id, label: provider.name })) },
            { id: 'poolId', label: t('resources.flash.filters.pool'), value: filters.poolId, allLabel: t('resources.flash.filters.allPools'), options: options.pools.map((pool) => ({ value: pool.id, label: `${pool.name} · ${providerNames.get(pool.providerId) ?? pool.providerId}` })) },
            { id: 'hostId', label: t('resources.flash.filters.host'), value: filters.hostId, allLabel: t('resources.flash.filters.allHosts'), options: options.hosts.map((host) => ({ value: host.id, label: `${host.name} · ${providerNames.get(host.providerId) ?? host.providerId}` })) },
            { id: 'status', label: t('resources.flash.filters.status'), value: filters.status, allLabel: t('resources.flash.filters.allStatuses'), options: options.statuses.map((status) => ({ value: status, label: status })) },
          ]}
          onSearchChange={(search) => { updateFilters({ search }) }}
          onFiltersChange={(next) => { updateFilters(next) }}
          onReset={() => {
            setFilters(initialFilters)
            onProviderIdChange('')
            setPage(1)
          }}
          filterTitle={t('resources.flash.filters.title')}
          filterLabel={t('common.filters')}
          density={density}
          onDensityChange={setDensity}
          labels={{ cancel: t('buttons.cancel'), clear: t('buttons.clearAll'), apply: t('buttons.apply') }}
        />}
        pagination={<DataTablePagination page={safePage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} />}
      >
        <DataTable
          columns={createFlashSystemColumns(labels, hostSummaries, hostLabels)}
          rows={rows}
          rowKey={(row) => row.resourceId}
          density={density}
          selectedRowKey={selected?.resourceId ?? null}
          onRowClick={setSelected}
          rowAriaLabel={(row) => `${t('resources.common.showDetails')} ${row.name}`}
          ariaLabel={t('resources.flash.tableLabel')}
          minWidthClassName="min-w-[1024px]"
          emptyContent={<EmptyState title={t('resources.flash.empty.title')} description={t('resources.flash.empty.description')} action={<Button size="sm" variant="outline" onClick={() => { setFilters(initialFilters) }}>{t('pages.virtualMachines.empty.clearFilters')}</Button>} />}
        />
      </ResourceInventoryPanel>
      <FlashSystemVolumeDetailPanel
        volume={selected}
        open={selected !== null}
        onClose={() => { setSelected(null) }}
        labels={{
          selected: t('resources.flash.detail.selected'), detail: t('resources.flash.detail.ariaLabel'), close: t('resources.flash.detail.close'),
          pool: t('resources.flash.detail.pool'), capacity: labels.capacity, usedCapacity: t('resources.flash.detail.used'),
          freeCapacity: t('resources.flash.detail.free'),
          groups: {
            identity: t('resources.flash.groups.identity'),
            placement: t('resources.flash.groups.placement'),
            state: t('resources.flash.groups.state'),
            copies: t('resources.flash.groups.copies'),
          },
          fieldLabels: Object.fromEntries([
            'id', 'volume_id', 'vdisk_UID', 'mdisk_grp_id',
            'parent_mdisk_grp_id', 'parent_mdisk_grp_name',
            'IO_group_id', 'IO_group_name', 'function', 'protocol',
            'fast_write_state', 'formatting', 'encrypt', 'FC_id', 'FC_name', 'RC_id',
            'RC_name', 'se_copy_count',
            'compressed_copy_count', 'RC_change',
          ].map((field) => [field, t(`resources.flash.fields.${field}`)])),
        }}
      />
    </>
  )
}
