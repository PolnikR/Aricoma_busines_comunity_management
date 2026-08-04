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
  [key: string]: string | number | boolean | null | undefined
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

export type PowerPartitionKind = 'LPAR' | 'VIOS'

export interface PowerPartitionResource {
  id: string
  providerId: string
  providerType: 'IBM_POWER'
  partitionKind: PowerPartitionKind
  partitionData: PowerPartitionData
  lpar: PowerPartitionData
  vios: PowerPartitionData
  partitionName: string
  partitionState: string
  systemName: string
  operatingSystemType: string
  deviceName: string
  bootMode: string
  powerOnWithHypervisor: string
  volumeCapacity: string
  volumeName: string
  volumeState: string
}

export interface PowerInventory {
  reportedCount: number
  countsByType: {
    LogicalPartition: number
    VirtualIOServer: number
  }
  virtualMachines: DiscoveredPowerVirtualMachine[]
  partitions: PowerPartitionResource[]
}

export interface FlashSystemHostMap {
  host_id: string
  scsi_id: string
}

export interface FlashSystemVolume {
  [key: string]: unknown
  id: string
  name: string
  IO_group_id: string
  IO_group_name: string
  status: string
  capacity: string
  type: string
  vdisk_UID: string
  mdisk_grp_id: string
  mdisk_grp_name: string
  FC_id: string
  FC_name: string
  RC_id: string
  RC_name: string
  fc_map_count: string
  copy_count: string
  fast_write_state: string
  se_copy_count: string
  RC_change: string
  compressed_copy_count: string
  parent_mdisk_grp_id: string
  parent_mdisk_grp_name: string
  formatting: string
  encrypt: string
  volume_id: string
  volume_name: string
  function: string
  protocol: string
  host_maps: FlashSystemHostMap[]
}

export interface FlashSystemPool {
  [key: string]: unknown
  name: string
  capacity: string
  used_capacity: string
  free_capacity: string
}

export interface FlashSystemHost {
  [key: string]: unknown
  name: string
  cluster_id: string | null
  cluster_name: string
}

export interface FlashSystemRelatedResource {
  [key: string]: unknown
  name: string
}

export interface ResolvedFlashSystemHostMap extends FlashSystemHostMap {
  hostName: string
  clusterId: string | null
  clusterName: string
}

export interface FlashSystemVolumeResource extends FlashSystemVolume {
  resourceId: string
  providerId: string
  providerType: 'FLASHCOPY'
  pool: FlashSystemPool | null
  resolvedHostMaps: ResolvedFlashSystemHostMap[]
  capacityBytes: number | null
}

export interface FlashSystemInventory {
  reportedCount: number
  volumes: FlashSystemVolume[]
  resources: FlashSystemVolumeResource[]
  pools: Record<string, FlashSystemPool>
  hosts: Record<string, FlashSystemHost>
  clusters: Record<string, FlashSystemRelatedResource>
}
