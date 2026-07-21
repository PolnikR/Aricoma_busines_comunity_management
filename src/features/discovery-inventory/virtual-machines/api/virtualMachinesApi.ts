import { fetchDiscoveryInventory } from '../../api/discoveryInventoryApi'
import type { DiscoveredVirtualMachine } from '../../model/discoveryTypes'
import type { VirtualMachine, VirtualMachinesPageData, VirtualMachinesQuery } from '../types'

function mapVirtualMachine(vm: DiscoveredVirtualMachine): VirtualMachine {
  const diskCapacityGb = vm.disks.reduce((total, disk) => total + disk.capacityGb, 0)

  return {
    id: vm.id,
    name: vm.name,
    powerState: vm.powerState,
    connectionState: vm.connectionState,
    guestOs: vm.guestOs,
    hostname: vm.hostname,
    ipAddress: vm.ipAddress,
    vcpu: vm.vcpu,
    memoryGb: vm.memoryGb,
    host: vm.host,
    cluster: vm.cluster,
    datastore: vm.primaryDatastore,
    folder: vm.folder,
    diskCount: vm.disks.length,
    diskCapacityGb,
    snapshotCount: vm.snapshotCount,
    toolsStatus: vm.toolsStatus,
    tags: vm.tags,
  }
}

function matchesSearch(vm: VirtualMachine, search: string) {
  const value = search.trim().toLowerCase()
  if (!value) return true

  return [vm.name, vm.hostname, vm.ipAddress, vm.guestOs, vm.host].some((field) => field.toLowerCase().includes(value))
}

function getSortedValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((first, second) => first.localeCompare(second))
}

export interface AllVirtualMachinesData {
  virtualMachines: VirtualMachine[]
  metrics: VirtualMachinesPageData['metrics']
  filterOptions: VirtualMachinesPageData['filterOptions']
}

export async function fetchAllVirtualMachines(): Promise<AllVirtualMachinesData> {
  const inventory = await fetchDiscoveryInventory()
  const virtualMachines = inventory.virtualMachines.map(mapVirtualMachine)

  return {
    virtualMachines,
    metrics: {
      total: virtualMachines.length,
      poweredOn: virtualMachines.filter((vm) => vm.powerState === 'poweredOn').length,
      clusters: new Set(virtualMachines.map((vm) => vm.cluster).filter(Boolean)).size,
      totalCpu: virtualMachines.reduce((total, vm) => total + vm.vcpu, 0),
      totalMemoryGb: virtualMachines.reduce((total, vm) => total + vm.memoryGb, 0),
    },
    filterOptions: {
      clusters: getSortedValues(virtualMachines.map((vm) => vm.cluster)),
      powerStates: getSortedValues(virtualMachines.map((vm) => vm.powerState)),
      connectionStates: getSortedValues(virtualMachines.map((vm) => vm.connectionState)),
    },
  }
}

export function applyFiltersAndPagination(data: AllVirtualMachinesData, query: VirtualMachinesQuery): VirtualMachinesPageData {
  const filtered = data.virtualMachines.filter((vm) => (
    matchesSearch(vm, query.search)
    && (!query.powerState || vm.powerState === query.powerState)
    && (!query.connectionState || vm.connectionState === query.connectionState)
    && (!query.cluster || vm.cluster === query.cluster)
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

export async function fetchVirtualMachines(query: VirtualMachinesQuery): Promise<VirtualMachinesPageData> {
  const allData = await fetchAllVirtualMachines()
  return applyFiltersAndPagination(allData, query)
}
