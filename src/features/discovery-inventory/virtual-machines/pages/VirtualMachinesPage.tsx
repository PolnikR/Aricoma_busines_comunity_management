import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Card } from '@/shared/components/card/Card'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useAllVirtualMachines } from '../api/useAllVirtualMachines'
import { applyFiltersAndPagination } from '../api/virtualMachinesApi'
import { useTags } from '../api/useTags'
import { VirtualMachineDetailPanel } from '../components/VirtualMachineDetailPanel'
import { VirtualMachineMetrics } from '../components/VirtualMachineMetrics'
import { VirtualMachinesPagination } from '../components/VirtualMachinesPagination'
import { VirtualMachinesTable } from '../components/VirtualMachinesTable'
import { VirtualMachinesToolbar } from '../components/VirtualMachinesToolbar'
import { VirtualMachinesSkeleton } from '../skeletons'
import { useVirtualMachineSearchParams } from '../hooks/useVirtualMachineSearchParams'
import type { VirtualMachineFilters, VirtualMachinePageSize } from '../types'

const defaultFilters: VirtualMachineFilters = {
  search: '',
  powerState: '',
  connectionState: '',
  cluster: '',
  tags: [],
  untagged: false,
}

export function VirtualMachinesPage() {
  const { query, updateQuery, updateFilters } = useVirtualMachineSearchParams()
  const { data: allData, error, isPending, isFetching, refetch } = useAllVirtualMachines()
  const { data: availableTags = [] } = useTags()
  const [selectedId, setSelectedId] = useState<string | null>(null)

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

  const selectedVirtualMachine = data?.items.find((vm) => vm.id === selectedId) ?? data?.items[0] ?? null
  const filters: VirtualMachineFilters = {
    search: query.search,
    powerState: query.powerState,
    connectionState: query.connectionState,
    cluster: query.cluster,
    tags: query.tags,
    untagged: query.untagged,
  }

  if (isPending) {
    return (
      <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
        <PageHeader eyebrow="Discovery & Inventory" title="Virtual machines" description="VMware inventory, health and placement overview." />
        <VirtualMachinesSkeleton />
      </div>
    )
  }

  if (!data) {
    const message = error instanceof Error ? error.message : 'Unknown discovery error.'
    return (
      <>
        <PageHeader eyebrow="Discovery & Inventory" title="Virtual machines" description="VMware inventory, health and placement overview." />
        <FetchErrorAlert
          title="Virtual machines could not be loaded"
          description={message}
          retryLabel="Retry loading"
          variant="full"
          isRetrying={isFetching}
          onRetry={() => { void refetch() }}
        />
      </>
    )
  }

  const handlePageSizeChange = (pageSize: VirtualMachinePageSize) => { updateQuery({ pageSize }, true) }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow="Discovery & Inventory"
        title="Virtual machines"
        description="VMware inventory, health and placement overview."
        actions={<Button size="sm" variant="outline" onClick={() => { void refetch() }}>Refresh inventory</Button>}
      />

      <div className="flex flex-1 flex-col gap-4 lg:min-h-0">
        <VirtualMachineMetrics metrics={data.metrics} />

        {error ? (
          <FetchErrorAlert
            title="Latest request failed"
            description="Showing the previous successful page."
            isRetrying={isFetching}
            onRetry={() => { void refetch() }}
          />
        ) : null}

        <Card className="relative flex flex-1 flex-col overflow-hidden p-0 sm:p-0 lg:min-h-0">
          <div className="flex shrink-0 flex-col gap-2 border-b border-[#e3edf6] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#17233d]">Inventory records</h2>
                <p className="mt-0.5 text-sm text-[#71819a]">Browse and inspect discovered VMware resources.</p>
              </div>
              {isFetching ? <span className="inline-flex items-center gap-2 text-xs text-[#71819a]"><span className="size-2 animate-pulse rounded-full bg-[#0d91d7]" />Updating</span> : null}
            </div>
            <div className="grid flex-1 grid-cols-1 gap-3 bg-[#f5f8fc] p-3 lg:min-h-0 xl:grid-cols-[minmax(0,1fr)_350px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
              <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#dbe7f2] bg-white shadow-sm lg:min-h-0" aria-label="Virtual machine inventory table">
                <VirtualMachinesToolbar filters={filters} options={data.filterOptions} availableTags={availableTags} onFiltersChange={updateFilters} onReset={() => { updateFilters(defaultFilters) }} />
                <div className="flex-1 lg:min-h-0 lg:overflow-y-auto custom-scrollbar">
                  {data.items.length > 0 ? (
                    <VirtualMachinesTable virtualMachines={data.items} selectedId={selectedVirtualMachine?.id ?? null} onSelect={(virtualMachine) => { setSelectedId(virtualMachine.id) }} />
                  ) : (
                    <div className="p-4">
                      <EmptyState title="No virtual machines found" description="No inventory records match the current search and filters." action={<Button size="sm" variant="outline" onClick={() => { updateFilters(defaultFilters) }}>Clear filters</Button>} />
                    </div>
                  )}
                </div>
                <VirtualMachinesPagination data={{ ...data, page: query.page }} onPageChange={(page) => { updateQuery({ page }) }} onPageSizeChange={handlePageSizeChange} />
              </section>
              <VirtualMachineDetailPanel virtualMachine={selectedVirtualMachine} />
            </div>
        </Card>
      </div>
    </div>
  )
}
