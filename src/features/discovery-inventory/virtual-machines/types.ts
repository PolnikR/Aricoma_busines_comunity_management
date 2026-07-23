import type { DiscoveredVirtualDisk } from '../model/discoveryTypes'

export interface VirtualMachine {
  id: string
  name: string
  powerState: string
  connectionState: string
  guestOs: string
  hostname: string
  ipAddress: string
  vcpu: number
  memoryGb: number
  host: string
  cluster: string
  datastore: string
  folder: string
  vmPath: string
  providerId: string
  providerType: string
  diskCount: number
  diskCapacityGb: number
  vdisks: DiscoveredVirtualDisk[]
  snapshotCount: number
  toolsStatus: string
  tags: string[]
}

export interface VirtualMachineFilters {
  search: string
  powerState: string
  connectionState: string
  cluster: string
  providerId: string
  tags: string[]
  untagged: boolean
}

export type VirtualMachinePageSize = 10 | 25 | 50

export interface VirtualMachinesQuery extends VirtualMachineFilters {
  page: number
  pageSize: VirtualMachinePageSize
}

export interface VirtualMachineMetricsData {
  total: number
  poweredOn: number
  clusters: number
  totalCpu: number
  totalMemoryGb: number
}

export interface VirtualMachineFilterOptions {
  clusters: string[]
  powerStates: string[]
  connectionStates: string[]
}

export interface VirtualMachinesPageData {
  items: VirtualMachine[]
  total: number
  page: number
  pageSize: VirtualMachinePageSize
  pageCount: number
  metrics: VirtualMachineMetricsData
  filterOptions: VirtualMachineFilterOptions
}
