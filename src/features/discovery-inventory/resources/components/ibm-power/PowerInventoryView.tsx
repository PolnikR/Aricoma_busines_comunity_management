import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { DataTable, DataTablePagination } from '@/shared/components/data-table'
import type { TableDensity } from '@/shared/components/data-table'
import type { useTranslation } from '@/hooks/useTranslation'
import type { PowerPartitionResource } from '../../model/discoveryTypes'
import { createPowerColumns } from '../../config/powerColumns'
import { filterPowerResources, getPowerFilterOptions } from '../../helpers/filterSourceResources'
import type { PowerFilters } from '../../model/sourceInventoryTypes'
import { usePowerSearchParams } from '../../hooks/usePowerSearchParams'
import { IbmPowerDetailPanel } from './IbmPowerDetailPanel'
import { ResourceInventoryPanel, type ResourceInventoryPanelError } from '../ResourceInventoryPanel'
import { SourceInventoryToolbar } from '../SourceInventoryToolbar'

type Translate = ReturnType<typeof useTranslation>['t']

const initialFilters: PowerFilters = {
  search: '', partitionKind: '', partitionState: '', operatingSystemType: '', volumeState: '',
}

interface PowerInventoryViewProps {
  resources: PowerPartitionResource[]
  error?: ResourceInventoryPanelError | null
  t: Translate
}

export function PowerInventoryView({
  resources,
  error,
  t,
}: PowerInventoryViewProps) {
  const { query, updateQuery, updateFilters } = usePowerSearchParams()
  const [density, setDensity] = useState<TableDensity>('compact')
  const [selected, setSelected] = useState<PowerPartitionResource | null>(null)
  const filters = useMemo<PowerFilters>(() => ({
    search: query.search,
    partitionKind: query.partitionKind,
    partitionState: query.partitionState,
    operatingSystemType: query.operatingSystemType,
    volumeState: query.volumeState,
  }), [query.operatingSystemType, query.partitionKind, query.partitionState, query.search, query.volumeState])
  const resetFilters = initialFilters
  const options = useMemo(() => getPowerFilterOptions(resources), [resources])
  const filtered = useMemo(() => filterPowerResources(resources, filters), [filters, resources])
  const pageCount = Math.max(1, Math.ceil(filtered.length / query.pageSize))
  const safePage = Math.min(query.page, pageCount)
  const rows = filtered.slice((safePage - 1) * query.pageSize, safePage * query.pageSize)

  useEffect(() => {
    if (safePage !== query.page) updateQuery({ page: safePage })
  }, [query.page, safePage, updateQuery])
  const labels = {
    partition: t('resources.power.table.partition'),
    status: t('resources.power.table.status'),
    os: t('resources.power.table.os'),
    system: t('resources.power.table.system'),
    managementIp: t('resources.power.table.managementIp'),
    compute: t('resources.power.table.compute'),
    provider: t('resources.common.provider'),
  }

  return (
    <>
      <ResourceInventoryPanel
        ariaLabel={t('resources.power.tableLabel')}
        error={error ?? null}
        toolbar={<SourceInventoryToolbar
          search={filters.search}
          searchPlaceholder={t('resources.power.searchPlaceholder')}
          searchLabel={t('resources.power.searchLabel')}
          controls={[
            { id: 'partitionKind', label: t('resources.power.filters.kind'), value: filters.partitionKind, allLabel: t('resources.power.filters.allKinds'), options: options.partitionKinds.map((value) => ({ value, label: value })) },
            { id: 'partitionState', label: t('resources.power.filters.partitionState'), value: filters.partitionState, allLabel: t('resources.power.filters.allStates'), options: options.partitionStates.map((value) => ({ value, label: value })) },
            { id: 'operatingSystemType', label: labels.os, value: filters.operatingSystemType, allLabel: t('resources.power.filters.allOperatingSystems'), options: options.operatingSystemTypes.map((value) => ({ value, label: value })) },
            { id: 'volumeState', label: t('resources.power.filters.volumeState'), value: filters.volumeState, allLabel: t('resources.power.filters.allVolumeStates'), options: options.volumeStates.map((value) => ({ value, label: value })) },
          ]}
          onSearchChange={(search) => { updateFilters({ search }) }}
          onFiltersChange={(next) => { updateFilters(next) }}
          onReset={() => {
            updateFilters(resetFilters)
            setSelected(null)
          }}
          filterTitle={t('resources.power.filters.title')}
          filterLabel={t('common.filters')}
          density={density}
          onDensityChange={setDensity}
          labels={{ cancel: t('buttons.cancel'), clear: t('buttons.clearAll'), apply: t('buttons.apply') }}
        />}
        pagination={<DataTablePagination page={safePage} pageSize={query.pageSize} total={filtered.length} onPageChange={(page) => { updateQuery({ page }) }} onPageSizeChange={(pageSize) => { updateQuery({ pageSize }, true) }} />}
      >
        <DataTable
          columns={createPowerColumns(labels)}
          rows={rows}
          rowKey={(row) => row.id}
          density={density}
          selectedRowKey={selected?.id ?? null}
          onRowClick={setSelected}
          rowAriaLabel={(row) => `${t('resources.common.showDetails')} ${row.partitionName}`}
          ariaLabel={t('resources.power.tableLabel')}
          minWidthClassName="min-w-[960px]"
          emptyContent={<EmptyState title={t('resources.power.empty.title')} description={t('resources.power.empty.description')} action={<Button size="sm" variant="outline" onClick={() => { updateFilters(resetFilters) }}>{t('pages.virtualMachines.empty.clearFilters')}</Button>} />}
        />
      </ResourceInventoryPanel>
      <IbmPowerDetailPanel
        partition={selected}
        open={selected !== null}
        onClose={() => { setSelected(null) }}
        labels={{
          selected: t('resources.power.detail.selected'),
          detail: t('resources.power.detail.ariaLabel'),
          close: t('resources.power.detail.close'),
          yes: t('common.yes'),
          no: t('common.no'),
          sections: {
            summary: t('resources.power.detail.summary'),
            processorMemory: t('resources.power.groups.processorMemory'),
            network: t('resources.power.groups.networkMonitoring'),
            storage: t('resources.power.groups.storage'),
            virtualIo: t('resources.power.groups.virtualIo'),
          },
          fields: {
            partitionUuid: t('resources.power.fields.PartitionUUID'),
            logicalSerialNumber: t('resources.power.fields.LogicalSerialNumber'),
            lastActivatedProfile: t('resources.power.fields.LastActivatedProfile'),
            uptime: t('resources.power.fields.Uptime'),
            bootable: t('resources.power.fields.IsBootable'),
            processors: t('resources.power.detail.processors'),
            processorLimits: t('resources.power.detail.processorLimits'),
            processorMode: t('resources.power.detail.processorMode'),
            memory: t('resources.power.detail.memory'),
            memoryLimits: t('resources.power.detail.memoryLimits'),
            interface: t('resources.power.detail.interface'),
            address: t('resources.power.detail.address'),
            interfaceState: t('resources.power.detail.interfaceState'),
            monitoring: t('resources.power.detail.monitoring'),
            volume: t('resources.power.detail.volume'),
            capacity: t('resources.power.fields.VolumeCapacity'),
            volumeUniqueId: t('resources.power.fields.VolumeUniqueID'),
            reservation: t('resources.power.detail.reservation'),
            storageConnection: t('resources.power.detail.storageConnection'),
            fibreChannelIdentity: t('resources.power.detail.fibreChannelIdentity'),
            virtualIoSlots: t('resources.power.fields.MaximumVirtualIOSlots'),
            physicalIo: t('resources.power.detail.physicalIo'),
            sriov: t('resources.power.detail.sriov'),
          },
          values: {
            dedicated: t('resources.power.detail.dedicated'),
            shared: t('resources.power.detail.shared'),
            fibreChannel: t('resources.power.detail.fibreChannel'),
            iscsi: t('resources.power.detail.iscsi'),
            direct: t('resources.power.detail.direct'),
          },
        }}
      />
    </>
  )
}
