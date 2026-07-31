import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { DataTablePagination } from '@/shared/components/data-table'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { useTranslation } from '@/hooks/useTranslation'
import { useDiscoveryInventory } from '@/features/discovery-inventory/hooks/useDiscoveryInventory'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import { useTags } from '../../hooks/useTags'
import { applyFiltersAndPagination } from '../helpers/filterVirtualMachines'
import { mapInventoryToVirtualMachines } from '../helpers/mapInventoryToVirtualMachines'
import { VirtualMachineDetailPanel } from '../components/vmware/VirtualMachineDetailPanel'
import { VirtualMachineMetrics } from '../components/vmware/VirtualMachineMetrics'
import { VirtualMachinesTable, type TableDensity } from '../components/vmware/VirtualMachinesTable'
import { VirtualMachinesToolbar } from '../components/vmware/VirtualMachinesToolbar'
import { MetricsSkeleton } from '../skeletons'
import { useVirtualMachineSearchParams } from '../hooks/useVirtualMachineSearchParams'
import type { VirtualMachineFilters, VirtualMachinePageSize } from '../types'
import { useResourceTabSearchParam } from '../hooks/useResourceTabSearchParam'
import { ResourceInventoryShell } from '../components/ResourceInventoryShell'
import { ResourceInventoryLoading, ResourceInventoryState } from '../components/ResourceInventoryStates'
import { NonVmwareResourcesPage } from '../components/NonVmwareResourcesPage'

const defaultFilters: VirtualMachineFilters = {
  search: '',
  powerState: '',
  connectionState: '',
  cluster: '',
  providerId: '',
  tags: [],
  untagged: false,
}

export function ResourcesPage() {
  const { t } = useTranslation()
  const { resourceTab, setResourceTab } = useResourceTabSearchParam()
  const { query, updateQuery, updateFilters } = useVirtualMachineSearchParams()
  const {
    data: providers = [],
    error: providersError,
    isLoading: providersLoading,
    isSuccess: providersSuccess,
    isFetching: providersFetching,
    refetch: refetchProviders,
  } = useProviders()
  const vmwareProviders = providers.filter((provider) => provider.type === 'VMWARE')
  const vmwareEnabled = resourceTab === 'vmware' && providersSuccess && vmwareProviders.length > 0
  const { data: inventory, error, isLoading: isPending, isFetching, refetch } = useDiscoveryInventory(query.providerId ?? undefined, query.tags[0], vmwareEnabled)
  const { data: availableTags = [] } = useTags(vmwareEnabled)
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
    if (availableTags.length > 0 && query.tags.length > 0) {
      const validTags = query.tags.filter((tag) => availableTags.includes(tag))
      if (validTags.length !== query.tags.length) {
        updateQuery({ tags: validTags }, true)
      }
    }
  }, [availableTags, query.tags, updateQuery])

  const selectedVirtualMachine = data?.items.find((vm) => vm.id === selectedId) ?? null

  const handleSelect = (id: string) => { setSelectedId(id); setDrawerOpen(true) }
  const handleCloseDrawer = () => { setDrawerOpen(false); setSelectedId(null) }
  const filters: VirtualMachineFilters = {
    search: query.search,
    powerState: query.powerState,
    connectionState: query.connectionState,
    cluster: query.cluster,
    providerId: query.providerId,
    tags: query.tags,
    untagged: query.untagged,
  }

  const tabs = (
    <Tabs
      items={[
        { value: 'vmware', label: t('pages.virtualMachines.tabs.vmware') },
        { value: 'flashsystem', label: t('pages.virtualMachines.tabs.flashSystem') },
        { value: 'ibm-power', label: t('pages.virtualMachines.tabs.ibmPower') },
      ]}
      value={resourceTab}
      onChange={(tab) => { setResourceTab(tab); handleCloseDrawer() }}
      ariaLabel={t('pages.virtualMachines.tabs.label')}
      className="w-full shrink-0 border-b-0 bg-white px-0 sm:w-auto"
    />
  )

  const providerPending = providersLoading || (!providersSuccess && providersError === null)
  if (resourceTab !== 'vmware') {
    return (
      <NonVmwareResourcesPage
        resourceTab={resourceTab}
        providers={providers}
        providersPending={providerPending}
        providersSuccess={providersSuccess}
        providersFetching={providersFetching}
        providersError={providersError instanceof Error ? providersError : null}
        onRefetchProviders={() => { void refetchProviders() }}
        tabs={tabs}
        t={t}
      />
    )
  }

  const handlePageSizeChange = (pageSize: VirtualMachinePageSize) => { updateQuery({ pageSize }, true) }
  const vmwareLoading = providersSuccess && vmwareProviders.length > 0 && isPending
  const vmwareMetrics = providerPending || vmwareLoading
    ? <MetricsSkeleton />
    : data && !providersError
      ? <VirtualMachineMetrics metrics={data.metrics} />
      : null
  const vmwareNotice = error && data ? (
    <FetchErrorAlert
      title={t('pages.virtualMachines.error.latestFailed')}
      description={t('pages.virtualMachines.error.showingPrevious')}
      isRetrying={isFetching}
      onRetry={handleRefetch}
    />
  ) : null

  let vmwareContent
  if (providerPending) {
    vmwareContent = <ResourceInventoryLoading ariaLabel={t('providers.loading')} />
  } else if (providersError) {
    vmwareContent = (
      <ResourceInventoryState>
        <FetchErrorAlert
          title={t('providers.loadFailed')}
          description={t('providers.loadFailed')}
          retryLabel={t('pages.virtualMachines.error.retryButton')}
          variant="full"
          isRetrying={providersFetching}
          onRetry={() => { void refetchProviders() }}
        />
      </ResourceInventoryState>
    )
  } else if (vmwareProviders.length === 0) {
    vmwareContent = (
      <ResourceInventoryState>
        <EmptyState title={t('resources.common.noProviderTitle')} description={t('resources.common.noProviderDescription')} />
      </ResourceInventoryState>
    )
  } else if (vmwareLoading) {
    vmwareContent = <ResourceInventoryLoading ariaLabel={t('status.loading')} />
  } else if (!data) {
    vmwareContent = (
      <ResourceInventoryState>
        <FetchErrorAlert
          title={t('pages.virtualMachines.error.title')}
          description={t('pages.virtualMachines.error.unknown')}
          retryLabel={t('pages.virtualMachines.error.retryButton')}
          variant="full"
          isRetrying={isFetching}
          onRetry={handleRefetch}
        />
      </ResourceInventoryState>
    )
  } else {
    vmwareContent = (
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#dbe7f2] bg-white shadow-sm lg:min-h-0" aria-label={t('vm.inventoryLabel')}>
        <VirtualMachinesToolbar filters={filters} options={data.filterOptions} availableTags={availableTags} providers={vmwareProviders} providersLoading={false} onFiltersChange={updateFilters} onReset={() => { updateFilters(defaultFilters) }} density={density} onDensityChange={setDensity} />
        <div className="custom-scrollbar flex-1 lg:min-h-0 lg:overflow-y-auto">
          {data.items.length > 0 ? (
            <VirtualMachinesTable virtualMachines={data.items} selectedId={selectedId} density={density} onSelect={(virtualMachine) => { handleSelect(virtualMachine.id) }} />
          ) : (
            <div className="p-4">
              <EmptyState title={t('pages.virtualMachines.empty.title')} description={t('pages.virtualMachines.empty.description')} action={<Button size="sm" variant="outline" onClick={() => { updateFilters(defaultFilters) }}>{t('pages.virtualMachines.empty.clearFilters')}</Button>} />
            </div>
          )}
        </div>
        <DataTablePagination
          page={query.page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={(page) => { updateQuery({ page }) }}
          onPageSizeChange={(pageSize) => { handlePageSizeChange(pageSize as VirtualMachinePageSize) }}
        />
      </section>
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
          if (!providersSuccess || vmwareProviders.length === 0) void refetchProviders()
          else handleRefetch()
        }}
      />
      <ResourceInventoryShell
        metrics={vmwareMetrics}
        inventoryTitle={t('pages.virtualMachines.inventory.title')}
        inventoryDescription={t('pages.virtualMachines.inventory.description')}
        tabs={tabs}
        notice={vmwareNotice}
      >
        {vmwareContent}
      </ResourceInventoryShell>
      <VirtualMachineDetailPanel virtualMachine={selectedVirtualMachine} open={drawerOpen} onClose={handleCloseDrawer} />
    </div>
  )
}
