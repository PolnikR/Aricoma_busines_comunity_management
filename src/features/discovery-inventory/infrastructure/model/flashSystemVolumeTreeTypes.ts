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
