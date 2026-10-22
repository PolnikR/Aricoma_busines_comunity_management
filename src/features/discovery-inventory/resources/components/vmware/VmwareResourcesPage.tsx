import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { Button } from '@/shared/components/button/Button'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { DataTablePagination } from '@/shared/components/data-table'
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
import { ResourceViewportFrame } from '../ResourceViewportFrame'
import type { SourceResourcesPageProps } from '../SourceResourcesPageProps'
import { VirtualMachineDetailPanel } from './VirtualMachineDetailPanel'
import { VirtualMachineMetrics } from './VirtualMachineMetrics'
import { VirtualMachinesTable, type TableDensity } from './VirtualMachinesTable'
import { VirtualMachinesToolbar } from './VirtualMachinesToolbar'
import { VmwareProviderFilterSummary } from './VmwareProviderFilterSummary'
import type { VmwareProviderFilter } from '../../helpers/vmwareProviderFilter'
import { resolveVmwareInitialFilters } from '../../helpers/resolveVmwareInitialFilters'
import { readProviderFilterSnapshot } from '../../state/providerFilterSession'
import { VmwareInventoryUnavailableError, vmwareInventoryQuery } from '../../model/inventoryQueries'
import { useProviderInventoryDeleted } from '@/shared/query/useProviderInventoryDeleted'

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

interface VmwareResourcesPageProps extends SourceResourcesPageProps {
  backgroundPrefetchProvider?: ProviderRecord
}

export function VmwareResourcesPage(props: VmwareResourcesPageProps) {
  const queryClient = useQueryClient()
  const {
    providers, providersPending, providersSuccess, providersFetching,
    providersError, onRefetchProviders, providerId, tabs, t, role, backgroundPrefetchProvider,
  } = props
  const vmwareProviders = getProvidersByTypeAndRole(providers, 'VMWARE', role)
  const selectedProvider = vmwareProviders.find((provider) => provider.id === providerId) ?? vmwareProviders[0] ?? null
  const vmwareProviderScope = selectedProvider ? {
    id: selectedProvider.id,
    role,
    ...(selectedProvider.vmPrefix !== undefined ? { vmPrefix: selectedProvider.vmPrefix } : {}),
    ...(selectedProvider.vmTags !== undefined ? { vmTags: selectedProvider.vmTags } : {}),
  } : null
  const virtualMachineSearchParams = useVirtualMachineSearchParams(vmwareProviderScope)
  const { query, updateQuery, updateFilters, isInitialized } = virtualMachineSearchParams
  const compatibilityState = virtualMachineSearchParams as unknown as { providerFilter?: VmwareProviderFilter; isFilterFixed?: boolean }
  const providerFilter = compatibilityState.providerFilter
  const isFilterFixed = compatibilityState.isFilterFixed
  const resolvedProviderFilter: VmwareProviderFilter = providerFilter ?? { isFixed: false, prefix: '', tag: '', filters: { search: '', tags: [] } }
  const resolvedIsFilterFixed = isFilterFixed ?? resolvedProviderFilter.isFixed
  const inventoryEnabled = providersSuccess && selectedProvider !== null && isInitialized
  const serverSideTag = getServerSideTagFilter(query.tags)
  const {
    data: inventory,
    isInitialLoading,
    isFetching,
    isBackgroundFetching,
    isError,
    isEmpty,
    isSuccess,
    isPlaceholderData,
    isDebouncing,
    refetch,
    forceRefresh,
    isForceRefreshing,
    forceRefreshError,
  } = useVmwareResourceInventory({
    ...(selectedProvider?.id !== undefined ? { providerId: selectedProvider.id } : {}),
    namePrefix: query.search,
    ...(serverSideTag !== undefined ? { tag: serverSideTag } : {}),
    enabled: inventoryEnabled,
  })
  const { data: serverTags = [] } = useTags(selectedProvider?.id, inventoryEnabled)
  const availableTags = useMemo(
    () => [...new Set([...serverTags, ...query.tags])],
    [query.tags, serverTags],
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [density, setDensity] = useState<TableDensity>('compact')
  const handleRefetch = () => { void refetch() }
  const handleForceRefresh = () => { void forceRefresh().catch(() => undefined) }

  const allData = useMemo(
    () => inventory ? mapInventoryToVirtualMachines(inventory) : null,
    [inventory],
  )
  const data = allData ? applyFiltersAndPagination(allData, query) : null

  const backgroundProviderId = backgroundPrefetchProvider?.id
  const backgroundDeleted = useProviderInventoryDeleted(backgroundProviderId)
  const backgroundPrefix = backgroundPrefetchProvider?.vmPrefix ?? null
  const backgroundTag = backgroundPrefetchProvider?.vmTags?.map(tag => tag.trim()).find(Boolean) ?? ''
  const canPrefetch = role === 'source' && inventoryEnabled && !providersPending && !providersError
    && isSuccess && Boolean(inventory) && !isPlaceholderData && !isDebouncing && !isFetching && !isForceRefreshing
    && backgroundPrefetchProvider?.type === 'VMWARE' && backgroundPrefetchProvider.role !== 'target'
    && backgroundPrefetchProvider.credentialStatus !== 'missing' && backgroundProviderId !== selectedProvider.id

  useEffect(() => {
    if (!canPrefetch || !backgroundProviderId || backgroundDeleted) return
    let disposed = false
    const run = () => {
      if (disposed) return
      // Switching provider tabs clears URL filters; restore the destination's own scope.
      const filters = resolveVmwareInitialFilters({
        id: backgroundProviderId, role: 'source', vmPrefix: backgroundPrefix, vmTags: backgroundTag ? [backgroundTag] : [],
      }, new URLSearchParams(), readProviderFilterSnapshot({ role: 'source', resourceTab: 'vmware', providerId: backgroundProviderId }))
      const tag = getServerSideTagFilter(filters.tags)
      const options = vmwareInventoryQuery({ providerId: backgroundProviderId, namePrefix: filters.search, ...(tag ? { tag } : {}) })
      const state = queryClient.getQueryState(options.queryKey)
      if (state?.status === 'error' && !(state.error instanceof VmwareInventoryUnavailableError)) return
      void queryClient.prefetchQuery(options)
    }
    const idle = typeof window.requestIdleCallback === 'function'
    const id = idle ? window.requestIdleCallback(run, { timeout: 1000 }) : window.setTimeout(run, 0)
    return () => {
      disposed = true
      if (idle) window.cancelIdleCallback(id)
      else window.clearTimeout(id)
    }
  }, [queryClient, canPrefetch, backgroundProviderId, backgroundPrefix, backgroundTag, backgroundDeleted])

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
    ? <VirtualMachineMetrics isLoading />
    : data && !providersError
      ? <VirtualMachineMetrics metrics={data.metrics} />
      : null
  const notice = (isError || forceRefreshError) && data ? (
    <FetchErrorAlert
      title={t('pages.virtualMachines.error.latestFailed')}
      description={t('pages.virtualMachines.error.showingPrevious')}
      isRetrying={isFetching || isForceRefreshing}
      onRetry={isError ? handleRefetch : handleForceRefresh}
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
          isFilterFixed={resolvedIsFilterFixed}
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
        {isBackgroundFetching || data?.items.length ? (
          <VirtualMachinesTable
            virtualMachines={data?.items ?? []}
            selectedId={selectedId}
            density={density}
            isLoading={isBackgroundFetching}
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
              action={<Button size="sm" variant="outline" disabled={resolvedIsFilterFixed} onClick={() => { updateFilters(defaultFilters) }}>{t('pages.virtualMachines.empty.clearFilters')}</Button>}
            />
          </div>
        ) : null}
      </ResourceInventoryPanel>
    )
  }

  return (
    <ResourceViewportFrame>
      <TableToolbar
        title={t('pages.virtualMachines.title')}
        description={t('pages.virtualMachines.description')}
        isFetching={providersFetching || isFetching || isForceRefreshing}
        onRefresh={() => {
          if (!providersSuccess || vmwareProviders.length === 0) onRefetchProviders()
          else handleForceRefresh()
        }}
      />
      <ResourceInventoryShell
        metrics={metrics}
        inventoryTitle={t('pages.virtualMachines.inventory.title')}
        inventoryDescription={resolvedProviderFilter.isFixed ? (
          <VmwareProviderFilterSummary
            filter={resolvedProviderFilter}
            label={t('pages.virtualMachines.inventory.providerFilter')}
            nameLabel={t('pages.virtualMachines.inventory.vmName')}
            tagLabel={t('pages.virtualMachines.inventory.vmTag')}
          />
        ) : t('pages.virtualMachines.inventory.description')}
        tabs={tabs}
        notice={notice}
      >
        {content}
      </ResourceInventoryShell>
      <VirtualMachineDetailPanel
        virtualMachine={selectedVirtualMachine}
        open={drawerOpen}
        providers={providers}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedId(null)
        }}
      />
    </ResourceViewportFrame>
  )
}
