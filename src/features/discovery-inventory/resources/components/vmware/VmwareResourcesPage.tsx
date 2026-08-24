import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { DataTablePagination } from '@/shared/components/data-table'
import { MetricsSkeleton } from '@/shared/components/stat-card/StatCard'
import { useVmwareResourceInventory } from '@/features/discovery-inventory/resources/hooks/useVmwareResourceInventory'
import { useTags } from '../../hooks/useVmwareTags'
import {
  applyFiltersAndPagination,
  getServerSideTagFilter,
} from '../../helpers/filterVirtualMachines'
import { mapInventoryToVirtualMachines } from '../../helpers/mapInventoryToVirtualMachines'
import { useVirtualMachineSearchParams } from '../../hooks/useVirtualMachineSearchParams'
import type { VirtualMachineFilterOptions, VirtualMachineFilters, VirtualMachinePageSize } from '../../types/virtualMachineTypes'
import { getProvidersByTypeAndRole } from '@/features/providers-connectors/providers/utils/providerFilters'
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
    providersError, onRefetchProviders, providerId, tabs, t, role,
  } = props
  const vmwareProviders = getProvidersByTypeAndRole(providers, 'VMWARE', role)
  const selectedProvider = vmwareProviders.find((provider) => provider.id === providerId) ?? vmwareProviders[0] ?? null
  const vmwareProviderScope = selectedProvider ? {
    id: selectedProvider.id,
    role,
    ...(selectedProvider.vmPrefix !== undefined ? { vmPrefix: selectedProvider.vmPrefix } : {}),
    ...(selectedProvider.vmTags !== undefined ? { vmTags: selectedProvider.vmTags } : {}),
  } : null
  const { query, updateQuery, updateFilters, isInitialized } = useVirtualMachineSearchParams(vmwareProviderScope)
  const inventoryEnabled = providersSuccess && selectedProvider !== null && isInitialized
  const {
    data: inventory,
    isInitialLoading,
    isFetching,
    isError,
    isEmpty,
    refetch,
  } = useVmwareResourceInventory(
    selectedProvider?.id,
    query.search,
    getServerSideTagFilter(query.tags),
    inventoryEnabled,
  )
  const { data: serverTags = [] } = useTags(selectedProvider?.id, inventoryEnabled)
  const availableTags = useMemo(
    () => [...new Set([...serverTags, ...query.tags])],
    [query.tags, serverTags],
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [density, setDensity] = useState<TableDensity>('compact')
  const handleRefetch = () => { void refetch() }

  const allData = useMemo(
    () => inventory ? mapInventoryToVirtualMachines(inventory) : null,
    [inventory],
  )
  const data = allData ? applyFiltersAndPagination(allData, query) : null

  useEffect(() => {
    if (!isFetching && data && data.page !== query.page) updateQuery({ page: data.page })
  }, [data, isFetching, query.page, updateQuery])

  useEffect(() => {
    if (selectedId && !data?.items.some((vm) => vm.id === selectedId)) {
      queueMicrotask(() => {
        setSelectedId(null)
        setDrawerOpen(false)
      })
    }
  }, [data, selectedId])

  const selectedVirtualMachine = data?.items.find((vm) => vm.id === selectedId) ?? null
  const filters: VirtualMachineFilters = {
    search: query.search,
    powerState: query.powerState,
    connectionState: query.connectionState,
    cluster: query.cluster,
    tags: query.tags,
    untagged: query.untagged,
  }
  const vmwareLoading = providersSuccess && vmwareProviders.length > 0 && isInitialLoading
  const metrics = providersPending || vmwareLoading
    ? <MetricsSkeleton />
    : data && !providersError
      ? <VirtualMachineMetrics metrics={data.metrics} />
      : null
  const notice = isError && data ? (
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
          onReset={() => { updateFilters(defaultFilters) }}
          density={density}
          onDensityChange={setDensity}
        />}
        error={isError && !data ? {
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
        ) : isEmpty ? (
          <div className="p-4">
            <EmptyState
              title={t('pages.virtualMachines.empty.title')}
              description={t('pages.virtualMachines.empty.description')}
              action={<Button size="sm" variant="outline" onClick={() => { updateFilters(defaultFilters) }}>{t('pages.virtualMachines.empty.clearFilters')}</Button>}
            />
          </div>
        ) : null}
      </ResourceInventoryPanel>
    )
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t(role === 'target' ? 'pages.resourcesIse.eyebrow' : 'pages.virtualMachines.eyebrow')}
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
