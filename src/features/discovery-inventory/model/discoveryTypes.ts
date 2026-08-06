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

export type FlashSystemVolumeTreeView = 'flat' | 'snapshot' | 'consistency_group'

export interface FlashSystemTreePoolDetail {
  id: string
  name: string
  status: string
  mdisk_count: string
  vdisk_count: string
  capacity: string
  extent_size: string
  free_capacity: string
  virtual_capacity: string
  used_capacity: string
  real_capacity: string
  overallocation: string
  warning: string
  easy_tier: string
  easy_tier_status: string
  compression_active: string
  compression_virtual_capacity: string
  compression_compressed_capacity: string
  compression_uncompressed_capacity: string
  parent_mdisk_grp_id: string
  parent_mdisk_grp_name: string
  child_mdisk_grp_count: string
  child_mdisk_grp_capacity: string
  type: string
  encrypt: string
  owner_type: string
  site_id: string
  site_name: string
  data_reduction: string
  used_capacity_before_reduction: string
  used_capacity_after_reduction: string
  overhead_capacity: string
  deduplication_capacity_saving: string
  reclaimable_capacity: string
  easy_tier_fcm_over_allocation_max: string
  volume_count: number
}

export interface FlashSystemTreeVolumeHostMap {
  host_id: string
  host_name: string
  cluster_name: string
  scsi_id: string
}

export interface FlashSystemTreeVolumeDetail {
  id: string
  name: string
  IO_group_id: string
  IO_group_name: string
  status: string
  mdisk_grp_id: string
  mdisk_grp_name: string
  capacity: string
  type: string
  FC_id: string
  FC_name: string
  RC_id: string
  RC_name: string
  vdisk_UID: string
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
  host_maps: FlashSystemTreeVolumeHostMap[]
  is_snapshot_target: boolean
  has_snapshots: boolean
  snapshot_count: number
  resolved: boolean
  // Only present on the volume nested inside an fcmap subtree (snapshot/consistency_group views).
  role?: 'source' | 'target' | undefined
}

export interface FlashSystemTreeFcmapDetail {
  id: string
  name: string
  source_vdisk_id: string
  source_vdisk_name: string
  target_vdisk_id: string
  target_vdisk_name: string
  group_id: string
  group_name: string
  status: string
  progress: string
  copy_rate: string
  clean_progress: string
  incremental: string
  partner_FC_id: string
  partner_FC_name: string
  restoring: string
  start_time: string
  rc_controlled: string
  start_time_iso: string
}

export interface FlashSystemTreeConsistencyGroupDetail {
  id: string
  name: string
  status: string
  start_time: string
  fc_mapping_count: number
  pool_ids: string[]
  spans_pools: boolean
  is_synthetic: boolean
}

export type FlashSystemTreeNode =
  | { kind: 'pool'; id: string; name: string; key: string; detail: FlashSystemTreePoolDetail; children: FlashSystemTreeNode[] }
  | { kind: 'volume'; id: string; name: string; key: string; detail: FlashSystemTreeVolumeDetail; children: FlashSystemTreeNode[] }
  | { kind: 'fcmap'; id: string; name: string; key: string; detail: FlashSystemTreeFcmapDetail; children: FlashSystemTreeNode[] }
  | { kind: 'consistency_group'; id: string; name: string; key: string; detail: FlashSystemTreeConsistencyGroupDetail; children: FlashSystemTreeNode[] }

export interface FlashSystemVolumeTreeCounts {
  pools: number
  volumes: number
  fcmaps: number
  consistency_groups: number
}

export type FlashSystemVolumeTreeViews = Partial<Record<FlashSystemVolumeTreeView, FlashSystemTreeNode[]>>

export interface FlashSystemVolumeTreeResponse {
  counts: FlashSystemVolumeTreeCounts
  views: FlashSystemVolumeTreeViews
  provider_id: string
  provider_type: 'FLASHCOPY'
}
