import { useMemo, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Card } from '@/shared/components/card/Card'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useVirtualMachines } from '../api/useVirtualMachines'
import type { VirtualMachine, VirtualMachineFilters } from '../types'
import { VirtualMachineDetailPanel } from '../components/VirtualMachineDetailPanel'
import { VirtualMachineMetrics } from '../components/VirtualMachineMetrics'
import { VirtualMachinesTable } from '../components/VirtualMachinesTable'
import { VirtualMachinesToolbar } from '../components/VirtualMachinesToolbar'

const defaultFilters: VirtualMachineFilters = {
  search: '',
  powerState: '',
  connectionState: '',
  cluster: '',
}

const emptyVirtualMachines: VirtualMachine[] = []

function matchesSearch(vm: VirtualMachine, search: string) {
  const normalizedSearch = search.trim().toLowerCase()

  if (!normalizedSearch) {
    return true
  }

  return [vm.name, vm.hostname, vm.ipAddress, vm.guestOs].some((value) => value.toLowerCase().includes(normalizedSearch))
}

function applyFilters(virtualMachines: VirtualMachine[], filters: VirtualMachineFilters) {
  return virtualMachines.filter((vm) => {
    const matchesPower = filters.powerState ? vm.powerState === filters.powerState : true
    const matchesConnection = filters.connectionState ? vm.connectionState === filters.connectionState : true
    const matchesCluster = filters.cluster ? vm.cluster === filters.cluster : true

    return matchesSearch(vm, filters.search) && matchesPower && matchesConnection && matchesCluster
  })
}

function VirtualMachinesLoadingState() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading virtual machines">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {['metric-1', 'metric-2', 'metric-3', 'metric-4'].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]" />
    </div>
  )
}

interface VirtualMachinesErrorStateProps {
  message: string
  onRetry: () => void
}

function VirtualMachinesErrorState({ message, onRetry }: VirtualMachinesErrorStateProps) {
  return (
    <EmptyState
      title="Virtual machines could not be loaded"
      description={message}
      action={<Button onClick={onRetry}>Retry loading</Button>}
    />
  )
}

export function VirtualMachinesPage() {
  const { data, error, isPending, refetch } = useVirtualMachines()
  const [filters, setFilters] = useState<VirtualMachineFilters>(defaultFilters)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const virtualMachines = data ?? emptyVirtualMachines

  const clusters = useMemo(
    () => Array.from(new Set(virtualMachines.map((vm) => vm.cluster))).sort((first, second) => first.localeCompare(second)),
    [virtualMachines],
  )

  const filteredVirtualMachines = useMemo(() => applyFilters(virtualMachines, filters), [filters, virtualMachines])

  const selectedVirtualMachine = virtualMachines.find((vm) => vm.id === selectedId) ?? virtualMachines[0] ?? null

  if (isPending) {
    return (
      <>
        <PageHeader
          eyebrow="Discovery & Inventory"
          title="Virtual machines"
          description="Loading validated VMware discovery records from the current development fixture."
        />
        <VirtualMachinesLoadingState />
      </>
    )
  }

  if (error) {
    const message = error instanceof Error ? error.message : 'Unknown discovery error.'

    return (
      <>
        <PageHeader
          eyebrow="Discovery & Inventory"
          title="Virtual machines"
          description="The VM inventory view validates external JSON before rendering any discovered resources."
        />
        <VirtualMachinesErrorState message={message} onRetry={() => { void refetch() }} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Discovery & Inventory"
        title="Virtual machines"
        description="Validated VMware inventory slice with search, filters, placement context, and row-level inspection."
        actions={<Button variant="outline" onClick={() => { setFilters(defaultFilters) }}>Reset filters</Button>}
      />

      <div className="space-y-6">
        <VirtualMachineMetrics virtualMachines={virtualMachines} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="overflow-hidden p-0 sm:p-0">
            <div className="flex flex-col gap-2 border-b border-gray-200 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Inventory records</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Showing {filteredVirtualMachines.length} of {virtualMachines.length} discovered virtual machines.
                </p>
              </div>
            </div>

            <VirtualMachinesToolbar filters={filters} clusters={clusters} onFiltersChange={setFilters} />

            {filteredVirtualMachines.length > 0 ? (
              <VirtualMachinesTable
                virtualMachines={filteredVirtualMachines}
                selectedId={selectedId}
                onSelect={(virtualMachine) => { setSelectedId(virtualMachine.id) }}
              />
            ) : (
              <div className="p-5">
                <EmptyState
                  title="No virtual machines match the current filters"
                  description="Adjust search, power state, connection state, or cluster filter to bring records back into the table."
                  action={<Button variant="outline" onClick={() => { setFilters(defaultFilters) }}>Clear filters</Button>}
                />
              </div>
            )}
          </Card>

          <VirtualMachineDetailPanel virtualMachine={selectedVirtualMachine} />
        </div>
      </div>
    </>
  )
}