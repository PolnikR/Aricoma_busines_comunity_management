import type { AllVirtualMachinesData } from './mapInventoryToVirtualMachines'
import type { VirtualMachine, VirtualMachinesPageData, VirtualMachinesQuery } from '../types/virtualMachineTypes'

export function getServerSideTagFilter(tags: string[]): string | undefined {
  return tags.length === 1 ? tags[0] : undefined
}

function matchesSearch(vm: VirtualMachine, search: string) {
  const value = search.trim().toLowerCase()
  if (!value) return true

  return [vm.name, vm.hostname, vm.ipAddress, vm.guestOs, vm.host].some((field) => field.toLowerCase().includes(value))
}

export function applyFiltersAndPagination(data: AllVirtualMachinesData, query: VirtualMachinesQuery): VirtualMachinesPageData {
  const filtered = data.virtualMachines.filter((vm) => (
    matchesSearch(vm, query.search)
    && (!query.powerState || vm.powerState === query.powerState)
    && (!query.connectionState || vm.connectionState === query.connectionState)
    && (!query.cluster || vm.cluster === query.cluster)
    && (query.untagged ? vm.tags.length === 0 : (query.tags.length === 0 || query.tags.some((tag) => vm.tags.includes(tag))))
  ))
  const pageCount = Math.ceil(filtered.length / query.pageSize)
  const page = pageCount > 0 ? Math.min(Math.max(query.page, 1), pageCount) : 1
  const start = (page - 1) * query.pageSize

  return {
    items: filtered.slice(start, start + query.pageSize),
    total: filtered.length,
    page,
    pageSize: query.pageSize,
    pageCount,
    metrics: data.metrics,
    filterOptions: data.filterOptions,
  }
}
