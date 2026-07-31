import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Card } from '@/shared/components/card/Card'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { DataTablePagination } from '@/shared/components/data-table'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { useTranslation } from '@/hooks/useTranslation'
import { useDiscoveryInventory } from '@/features/discovery-inventory/hooks/useDiscoveryInventory'
import { useResourceInventoryQueries } from '@/features/discovery-inventory/hooks/useResourceInventoryQueries'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import { useTags } from '../../hooks/useTags'
import { applyFiltersAndPagination } from '../helpers/filterVirtualMachines'
import { mapInventoryToVirtualMachines } from '../helpers/mapInventoryToVirtualMachines'
import { VirtualMachineDetailPanel } from '../components/VirtualMachineDetailPanel'
import { VirtualMachineMetrics } from '../components/VirtualMachineMetrics'
import { VirtualMachinesTable, type TableDensity } from '../components/VirtualMachinesTable'
import { VirtualMachinesToolbar } from '../components/VirtualMachinesToolbar'
import { VirtualMachinesSkeleton } from '../skeletons'
import { useVirtualMachineSearchParams } from '../hooks/useVirtualMachineSearchParams'
import type { VirtualMachineFilters, VirtualMachinePageSize } from '../types'
import { FlashSystemInventoryView } from '../components/FlashSystemInventoryView'
import { PowerInventoryView } from '../components/PowerInventoryView'
import { useResourceTabSearchParam } from '../hooks/useResourceTabSearchParam'

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
  const { data: inventory, error, isLoading: isPending, isFetching, refetch } = useDiscoveryInventory(query.providerId ?? undefined, query.tags[0], resourceTab === 'vmware')
  const { data: availableTags = [] } = useTags(resourceTab === 'vmware')
  const { data: providers = [], isLoading: providersLoading } = useProviders()
  const sourceQueries = useResourceInventoryQueries(resourceTab === 'vmware' ? null : resourceTab, providers)
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

  if (resourceTab !== 'vmware') {
    const isSourceLoading = providersLoading || sourceQueries.isLoading
    const sourceProviders = providers.filter((provider) => provider.type === (resourceTab === 'flashsystem' ? 'FLASHCOPY' : 'IBM_POWER'))
    const hasData = resourceTab === 'flashsystem'
      ? sourceQueries.flashSystemResources.length > 0
      : sourceQueries.powerResources.length > 0
    const allFailed = sourceQueries.hasProviders && sourceQueries.failures.length === sourceProviders.length && !hasData

    return (
      <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
        <TableToolbar
          eyebrow={t('pages.virtualMachines.eyebrow')}
          title={t(resourceTab === 'flashsystem' ? 'resources.flash.title' : 'resources.power.title')}
          description={t(resourceTab === 'flashsystem' ? 'resources.flash.description' : 'resources.power.description')}
          isFetching={sourceQueries.isFetching}
          onRefresh={() => { void sourceQueries.refetch() }}
        />
        <div className="flex flex-1 flex-col gap-4 lg:min-h-0">
          <Card className="flex shrink-0 flex-col p-0 sm:p-0">
            <div className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#17233d]">{t('pages.virtualMachines.inventory.title')}</h2>
                <p className="text-xs text-[#71819a]">{t(resourceTab === 'flashsystem' ? 'resources.flash.inventoryDescription' : 'resources.power.inventoryDescription')}</p>
              </div>
              {tabs}
            </div>
          </Card>

          {sourceQueries.failures.length > 0 && !allFailed ? (
            <FetchErrorAlert
              title={t('resources.common.partialFailure')}
              description={`${t('resources.common.failedProviders')}: ${sourceQueries.failures.map(({ provider }) => provider.name).join(', ')}`}
              isRetrying={sourceQueries.isFetching}
              onRetry={() => { void sourceQueries.refetch() }}
            />
          ) : null}

          {isSourceLoading ? (
            <VirtualMachinesSkeleton />
          ) : !sourceQueries.hasProviders ? (
            <Card>
              <EmptyState title={t('resources.common.noProviderTitle')} description={t('resources.common.noProviderDescription')} />
            </Card>
          ) : allFailed ? (
            <FetchErrorAlert
              title={t('resources.common.loadFailed')}
              description={sourceQueries.failures.map(({ error }) => error.message).join('; ')}
              retryLabel={t('pages.virtualMachines.error.retryButton')}
              variant="full"
              isRetrying={sourceQueries.isFetching}
              onRetry={() => { void sourceQueries.refetch() }}
            />
          ) : (
            <div className="flex flex-1 flex-col gap-4 lg:min-h-0">
              {resourceTab === 'flashsystem' ? (
                <FlashSystemInventoryView
                  resources={sourceQueries.flashSystemResources}
                  inventories={sourceQueries.flashSystemInventories}
                  providers={sourceProviders}
                  t={t}
                />
              ) : (
                <PowerInventoryView resources={sourceQueries.powerResources} providers={sourceProviders} t={t} />
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
        <PageHeader eyebrow={t('pages.virtualMachines.eyebrow')} title={t('pages.virtualMachines.title')} description={t('pages.virtualMachines.description')} />
        <VirtualMachinesSkeleton />
      </div>
    )
  }

  if (!data) {
    const message = error instanceof Error ? error.message : t('messages.unknownError')
    return (
      <>
        <PageHeader eyebrow={t('pages.virtualMachines.eyebrow')} title={t('pages.virtualMachines.title')} description={t('pages.virtualMachines.description')} />
        <FetchErrorAlert
          title={t('pages.virtualMachines.error.title')}
          description={message}
          retryLabel={t('pages.virtualMachines.error.retryButton')}
          variant="full"
          isRetrying={isFetching}
          onRetry={handleRefetch}
        />
      </>
    )
  }

  const handlePageSizeChange = (pageSize: VirtualMachinePageSize) => { updateQuery({ pageSize }, true) }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t('pages.virtualMachines.eyebrow')}
        title={t('pages.virtualMachines.title')}
        description={t('pages.virtualMachines.description')}
        isFetching={isFetching}
        onRefresh={handleRefetch}
      />

      <div className="flex flex-1 flex-col gap-4 lg:min-h-0">
        <VirtualMachineMetrics metrics={data.metrics} />

        {error ? (
          <FetchErrorAlert
            title={t('pages.virtualMachines.error.latestFailed')}
            description={t('pages.virtualMachines.error.showingPrevious')}
            isRetrying={isFetching}
            onRetry={handleRefetch}
          />
        ) : null}

        <Card className="relative flex flex-1 flex-col overflow-hidden p-0 sm:p-0 lg:min-h-0">
          <div className="flex shrink-0 flex-col gap-2 border-b border-[#e3edf6] px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#17233d]">{t('pages.virtualMachines.inventory.title')}</h2>
              <p className="text-xs text-[#71819a]">{t('pages.virtualMachines.inventory.description')}</p>
            </div>
            {tabs}
          </div>
          <div className="flex flex-1 flex-col overflow-hidden bg-[#f5f8fc] p-3 lg:min-h-0">
            <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#dbe7f2] bg-white shadow-sm lg:min-h-0" aria-label={t('vm.inventoryLabel')}>
              <VirtualMachinesToolbar filters={filters} options={data.filterOptions} availableTags={availableTags} providers={providers} providersLoading={providersLoading} onFiltersChange={updateFilters} onReset={() => { updateFilters(defaultFilters) }} density={density} onDensityChange={setDensity} />
              <div className="flex-1 lg:min-h-0 lg:overflow-y-auto custom-scrollbar">
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
          </div>
        </Card>
      </div>

      <VirtualMachineDetailPanel virtualMachine={selectedVirtualMachine} open={drawerOpen} onClose={handleCloseDrawer} />
    </div>
  )
}
