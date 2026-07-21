export interface DiscoveredVirtualDisk {
  id: string
  label: string
  capacityGb: number
  datastore: string
  filePath: string
  thinProvisioned: boolean
}

export interface DiscoveredVirtualMachine {
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
  primaryDatastore: string
  folder: string
  disks: DiscoveredVirtualDisk[]
  snapshotCount: number
  toolsStatus: string
  tags: string[]
}

export interface DiscoveryInventory {
  reportedCount: number
  virtualMachines: DiscoveredVirtualMachine[]
}
