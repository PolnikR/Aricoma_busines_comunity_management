import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { DataTablePagination } from '@/shared/components/data-table'
import { useDiscoveryInventory } from '@/features/discovery-inventory/hooks/useDiscoveryInventory'
import { useTags } from '../../../hooks/useTags'
import {
  applyFiltersAndPagination,
  getServerSideTagFilter,
} from '../../helpers/filterVirtualMachines'
import { mapInventoryToVirtualMachines } from '../../helpers/mapInventoryToVirtualMachines'
import { useVirtualMachineSearchParams } from '../../hooks/useVirtualMachineSearchParams'
import type { VirtualMachineFilterOptions, VirtualMachineFilters, VirtualMachinePageSize } from '../../types'
import { filterByType } from '@/features/providers-connectors/providers/utils/providerFilters'
import { MetricsSkeleton } from '../../skeletons'
import { ResourceInventoryPanel } from '../ResourceInventoryPanel'
import { ResourceInventoryShell } from '../ResourceInventoryShell'
import { ResourceInventoryLoading, ResourceInventoryState } from '../ResourceInventoryStates'
import type { SourceResourcesPageProps } from '../SourceResourcesPageProps'
import { VirtualMachineDetailPanel } from './VirtualMachineDetailPanel'
import { VirtualMachineMetrics } from './VirtualMachineMetrics'
import { VirtualMachinesTable, type TableDensity } from './VirtualMachinesTable'
import { VirtualMachinesToolbar } from './VirtualMachinesToolbar'

const defaultFilters: VirtualMachineFilters = {
  search: '',
  powerState: '',
  connectionState: '',
  cluster: '',
  providerId: '',
  tags: [],
  untagged: false,
}

const emptyFilterOptions: VirtualMachineFilterOptions = {
  clusters: [],
  powerStates: [],
  connectionStates: [],
}

export function VmwareResourcesPage(props: SourceResourcesPageProps) {
  const {
    providers, providersPending, providersSuccess, providersFetching,
    providersError, onRefetchProviders, providerId, tabs, t,
  } = props
  const { query, updateQuery, updateFilters } = useVirtualMachineSearchParams()
  const vmwareProviders = filterByType(providers, 'VMWARE')
  const selectedProviderId = providerId ?? vmwareProviders[0]?.id ?? null
  const inventoryEnabled = providersSuccess && vmwareProviders.length > 0
  const {
    data: inventory,
    error,
    isLoading: isPending,
    isFetching,
    refetch,
  } = useDiscoveryInventory(
    selectedProviderId ?? undefined,
    getServerSideTagFilter(query.tags),
    inventoryEnabled,
  )
  const { data: availableTags = [] } = useTags(inventoryEnabled)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [density, setDensity] = useState<TableDensity>('compact')
  const handleRefetch = () => { void refetch() }

  const allData = useMemo(
    () => inventory ? mapInventoryToVirtualMachines(inventory) : null,
    [inventory],
  )
  const effectiveQuery = { ...query, providerId: selectedProviderId }
  const data = allData ? applyFiltersAndPagination(allData, effectiveQuery) : null

  useEffect(() => {
    if (!isFetching && data && data.page !== query.page) updateQuery({ page: data.page })
  }, [data, isFetching, query.page, updateQuery])

  useEffect(() => {
    if (availableTags.length > 0 && query.tags.length > 0) {
      const validTags = query.tags.filter((tag) => availableTags.includes(tag))
      if (validTags.length !== query.tags.length) updateQuery({ tags: validTags }, true)
    }
  }, [availableTags, query.tags, updateQuery])

  const selectedVirtualMachine = data?.items.find((vm) => vm.id === selectedId) ?? null
  const filters: VirtualMachineFilters = {
    search: query.search,
    powerState: query.powerState,
    connectionState: query.connectionState,
    cluster: query.cluster,
    providerId: selectedProviderId,
    tags: query.tags,
    untagged: query.untagged,
  }
  const vmwareLoading = providersSuccess && vmwareProviders.length > 0 && isPending
  const metrics = providersPending || vmwareLoading
    ? <MetricsSkeleton />
    : data && !providersError
      ? <VirtualMachineMetrics metrics={data.metrics} />
      : null
  const notice = error && data ? (
    <FetchErrorAlert
      title={t('pages.virtualMachines.error.latestFailed')}
      description={t('pages.virtualMachines.error.showingPrevious')}
      isRetrying={isFetching}
      onRetry={handleRefetch}
    />
  ) : null

  let content
  if (providersPending) {
    content = <ResourceInventoryLoading ariaLabel={t('providers.loading')} />
  } else if (providersError) {
    content = (
      <ResourceInventoryState>
        <FetchErrorAlert
          title={t('providers.loadFailed')}
          description={t('providers.loadFailed')}
          retryLabel={t('pages.virtualMachines.error.retryButton')}
          variant="full"
          isRetrying={providersFetching}
          onRetry={onRefetchProviders}
        />
      </ResourceInventoryState>
    )
  } else if (vmwareProviders.length === 0) {
    content = (
      <ResourceInventoryState>
        <EmptyState title={t('resources.common.noProviderTitle')} description={t('resources.common.noProviderDescription')} />
      </ResourceInventoryState>
    )
  } else if (vmwareLoading) {
    content = <ResourceInventoryLoading ariaLabel={t('status.loading')} />
  } else {
    content = (
      <ResourceInventoryPanel
        ariaLabel={t('vm.inventoryLabel')}
        toolbar={<VirtualMachinesToolbar
          filters={filters}
          options={data?.filterOptions ?? emptyFilterOptions}
          availableTags={availableTags}
          onFiltersChange={updateFilters}
          onReset={() => { updateFilters({ ...defaultFilters, providerId: selectedProviderId }) }}
          density={density}
          onDensityChange={setDensity}
        />}
        error={!data ? {
          title: t('pages.virtualMachines.error.title'),
          description: t('pages.virtualMachines.error.unknown'),
          retryLabel: t('pages.virtualMachines.error.retryButton'),
          isRetrying: isFetching,
          onRetry: handleRefetch,
        } : null}
        pagination={data ? <DataTablePagination
          page={query.page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={(page) => { updateQuery({ page }) }}
          onPageSizeChange={(pageSize) => { updateQuery({ pageSize: pageSize as VirtualMachinePageSize }, true) }}
        /> : null}
      >
        {data?.items.length ? (
          <VirtualMachinesTable
            virtualMachines={data.items}
            selectedId={selectedId}
            density={density}
            onSelect={(virtualMachine) => {
              setSelectedId(virtualMachine.id)
              setDrawerOpen(true)
            }}
          />
        ) : (
          <div className="p-4">
            <EmptyState
              title={t('pages.virtualMachines.empty.title')}
              description={t('pages.virtualMachines.empty.description')}
              action={<Button size="sm" variant="outline" onClick={() => { updateFilters({ ...defaultFilters, providerId: selectedProviderId }) }}>{t('pages.virtualMachines.empty.clearFilters')}</Button>}
            />
          </div>
        )}
      </ResourceInventoryPanel>
    )
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t('pages.virtualMachines.eyebrow')}
        title={t('pages.virtualMachines.title')}
        description={t('pages.virtualMachines.description')}
        isFetching={providersFetching || isFetching}
        onRefresh={() => {
          if (!providersSuccess || vmwareProviders.length === 0) onRefetchProviders()
          else handleRefetch()
        }}
      />
      <ResourceInventoryShell
        metrics={metrics}
        inventoryTitle={t('pages.virtualMachines.inventory.title')}
        inventoryDescription={t('pages.virtualMachines.inventory.description')}
        tabs={tabs}
        notice={notice}
      >
        {content}
      </ResourceInventoryShell>
      <VirtualMachineDetailPanel
        virtualMachine={selectedVirtualMachine}
        providers={providers}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedId(null)
        }}
      />
    </div>
  )
}
