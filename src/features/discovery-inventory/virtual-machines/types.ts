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
  diskCount: number
  diskCapacityGb: number
  snapshotCount: number
  toolsStatus: string
}

export interface VirtualMachineFilters {
  search: string
  powerState: string
  connectionState: string
  cluster: string
}