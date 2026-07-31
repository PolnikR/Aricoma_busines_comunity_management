import { useMemo, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { DataTable, DataTablePagination } from '@/shared/components/data-table'
import type { TableDensity } from '@/shared/components/data-table'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { useTranslation } from '@/hooks/useTranslation'
import type { PowerPartitionResource } from '../../model/discoveryTypes'
import { createPowerColumns } from '../config/powerColumns'
import { filterPowerResources, getPowerFilterOptions } from '../helpers/filterSourceResources'
import type { PowerFilters } from '../model/sourceInventoryTypes'
import { IbmPowerDetailPanel } from './IbmPowerDetailPanel'
import { SourceInventoryToolbar } from './SourceInventoryToolbar'

type Translate = ReturnType<typeof useTranslation>['t']

const initialFilters: PowerFilters = {
  search: '', providerId: '', partitionKind: '', partitionState: '', operatingSystemType: '', volumeState: '',
}

interface PowerInventoryViewProps {
  resources: PowerPartitionResource[]
  providers: ProviderRecord[]
  providerId: string
  onProviderIdChange: (providerId: string) => void
  t: Translate
}

export function PowerInventoryView({
  resources,
  providers,
  providerId,
  onProviderIdChange,
  t,
}: PowerInventoryViewProps) {
  const [filters, setFilters] = useState<PowerFilters>({ ...initialFilters, providerId })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [density, setDensity] = useState<TableDensity>('compact')
  const [selected, setSelected] = useState<PowerPartitionResource | null>(null)
  const options = useMemo(() => getPowerFilterOptions(resources), [resources])
  const filtered = useMemo(() => filterPowerResources(resources, filters), [filters, resources])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const updateFilters = (next: Partial<PowerFilters>) => {
    if (next.providerId !== undefined && next.providerId !== filters.providerId) {
      onProviderIdChange(next.providerId)
    }
    setFilters((current) => ({ ...current, ...next }))
    setPage(1)
  }
  const labels = {
    partition: t('resources.power.table.partition'), os: t('resources.power.table.os'), device: t('resources.power.table.device'),
    bootMode: t('resources.power.table.bootMode'), hypervisor: t('resources.power.table.hypervisor'),
    volumeCapacity: t('resources.power.table.volumeCapacity'), volume: t('resources.power.table.volume'),
    volumeState: t('resources.power.table.volumeState'), provider: t('resources.common.provider'),
  }

  return (
    <>
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#dbe7f2] bg-white shadow-sm lg:min-h-0" aria-label={t('resources.power.tableLabel')}>
        <SourceInventoryToolbar
          search={filters.search}
          searchPlaceholder={t('resources.power.searchPlaceholder')}
          searchLabel={t('resources.power.searchLabel')}
          controls={[
            { id: 'providerId', label: labels.provider, value: filters.providerId, allLabel: t('resources.common.allProviders'), options: providers.map((provider) => ({ value: provider.id, label: provider.name })) },
            { id: 'partitionKind', label: t('resources.power.filters.kind'), value: filters.partitionKind, allLabel: t('resources.power.filters.allKinds'), options: options.partitionKinds.map((value) => ({ value, label: value })) },
            { id: 'partitionState', label: t('resources.power.filters.partitionState'), value: filters.partitionState, allLabel: t('resources.power.filters.allStates'), options: options.partitionStates.map((value) => ({ value, label: value })) },
            { id: 'operatingSystemType', label: labels.os, value: filters.operatingSystemType, allLabel: t('resources.power.filters.allOperatingSystems'), options: options.operatingSystemTypes.map((value) => ({ value, label: value })) },
            { id: 'volumeState', label: labels.volumeState, value: filters.volumeState, allLabel: t('resources.power.filters.allVolumeStates'), options: options.volumeStates.map((value) => ({ value, label: value })) },
          ]}
          onSearchChange={(search) => { updateFilters({ search }) }}
          onFiltersChange={(next) => { updateFilters(next) }}
          onReset={() => {
            setFilters(initialFilters)
            onProviderIdChange('')
            setPage(1)
          }}
          filterTitle={t('resources.power.filters.title')}
          filterLabel={t('common.filters')}
          density={density}
          onDensityChange={setDensity}
          labels={{ cancel: t('buttons.cancel'), clear: t('buttons.clearAll'), apply: t('buttons.apply') }}
        />
        <div className="custom-scrollbar flex-1 lg:min-h-0 lg:overflow-y-auto">
          <DataTable
            columns={createPowerColumns(labels)}
            rows={rows}
            rowKey={(row) => row.id}
            density={density}
            selectedRowKey={selected?.id ?? null}
            onRowClick={setSelected}
            rowAriaLabel={(row) => `${t('resources.common.showDetails')} ${row.partitionName}`}
            ariaLabel={t('resources.power.tableLabel')}
            minWidthClassName="min-w-[1100px]"
            emptyContent={<EmptyState title={t('resources.power.empty.title')} description={t('resources.power.empty.description')} action={<Button size="sm" variant="outline" onClick={() => { setFilters(initialFilters) }}>{t('pages.virtualMachines.empty.clearFilters')}</Button>} />}
          />
        </div>
        <DataTablePagination page={safePage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} />
      </section>
      <IbmPowerDetailPanel
        partition={selected}
        open={selected !== null}
        onClose={() => { setSelected(null) }}
        labels={{
          selected: t('resources.power.detail.selected'), detail: t('resources.power.detail.ariaLabel'), close: t('resources.power.detail.close'),
          summary: t('resources.power.detail.summary'), provider: labels.provider, partitionKind: t('resources.power.filters.kind'),
          partitionState: t('resources.power.filters.partitionState'), interfaceState: t('resources.power.detail.interfaceState'),
          ipAddress: t('resources.power.detail.ipAddress'), subnetMask: t('resources.power.detail.subnetMask'),
          isBootable: t('resources.power.detail.isBootable'), maximumVirtualIoSlots: t('resources.power.detail.maximumVirtualIoSlots'),
          yes: t('common.yes'), no: t('common.no'),
          fieldLabels: Object.fromEntries([
            'PartitionName', 'OperatingSystemType', 'DeviceName', 'BootMode',
            'PowerOnWithHypervisor', 'VolumeCapacity', 'VolumeName', 'VolumeState',
            'State', 'IPAddress', 'SubnetMask', 'IsBootable', 'MaximumVirtualIOSlots',
          ].map((field) => [field, t(`resources.power.fields.${field}`)])),
          identity: t('resources.power.groups.identity'), processorMemory: t('resources.power.groups.processorMemory'),
          operatingSystem: t('resources.power.groups.operatingSystem'), network: t('resources.power.groups.network'),
          storage: t('resources.power.groups.storage'), virtualIo: t('resources.power.groups.virtualIo'), monitoring: t('resources.power.groups.monitoring'),
        }}
      />
    </>
  )
}
