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
  vmPath: string
  providerId: string
  providerType: string
  disks: DiscoveredVirtualDisk[]
  snapshotCount: number
  toolsStatus: string
  tags: string[]
}

export interface DiscoveryInventory {
  reportedCount: number
  virtualMachines: DiscoveredVirtualMachine[]
}

export interface PowerPartitionData {
  [key: string]: unknown
  PartitionUUID?: string | undefined
  PartitionName?: string | undefined
  PartitionType?: string | undefined
  PartitionState?: string | undefined
  SystemName?: string | undefined
}

export interface DiscoveredPowerVirtualMachine {
  lpar: PowerPartitionData
  vios: PowerPartitionData
}

export interface PowerInventory {
  reportedCount: number
  countsByType: {
    LogicalPartition: number
    VirtualIOServer: number
  }
  virtualMachines: DiscoveredPowerVirtualMachine[]
}

export interface FlashSystemHostMap {
  host_id: string
  scsi_id: string
}

export interface FlashSystemVolume {
  [key: string]: unknown
  id: string
  name: string
  status: string
  capacity: string
  type: string
  vdisk_UID: string
  mdisk_grp_id: string
  mdisk_grp_name: string
  host_maps: FlashSystemHostMap[]
}

export interface FlashSystemRelatedResource {
  [key: string]: unknown
  name: string
}

export interface FlashSystemInventory {
  reportedCount: number
  volumes: FlashSystemVolume[]
  pools: Record<string, FlashSystemRelatedResource>
  hosts: Record<string, FlashSystemRelatedResource>
  clusters: Record<string, FlashSystemRelatedResource>
}
