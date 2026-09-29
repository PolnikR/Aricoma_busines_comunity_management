import { bool, definePatch, int, loose, ref, schemaOf, str, withSchemas } from './definePatch.mjs'

const strings = (names, fallback) => Object.fromEntries(names.map(n => [n, str(fallback)]))

export default definePatch({
  name: 'volumeTree',
  isObsolete: spec => (schemaOf(spec, 'VolumeTreeNode').properties.kind.enum ? 'VolumeTreeNode.kind is an enum' : null),
  apply: (spec) => {
    const node = schemaOf(spec, 'VolumeTreeNode')
    return withSchemas(spec, {
      VolumeTreePoolDetail: loose({
        ...strings(['id', 'parent_mdisk_grp_id', 'parent_mdisk_grp_name', 'site_id', 'site_name'], ''),
        ...strings(['mdisk_count', 'vdisk_count', 'child_mdisk_grp_count'], '0'),
        ...strings(['name', 'capacity', 'extent_size', 'free_capacity', 'virtual_capacity', 'used_capacity', 'real_capacity',
          'overallocation', 'warning', 'easy_tier', 'easy_tier_status', 'compression_active', 'compression_virtual_capacity',
          'compression_compressed_capacity', 'compression_uncompressed_capacity', 'child_mdisk_grp_capacity', 'type', 'encrypt',
          'owner_type', 'data_reduction', 'used_capacity_before_reduction', 'used_capacity_after_reduction', 'overhead_capacity',
          'deduplication_capacity_saving', 'reclaimable_capacity', 'easy_tier_fcm_over_allocation_max'], '-'),
        status: str('unknown'),
        volume_count: int(0),
      }),
      VolumeTreeVolumeDetail: loose({
        ...strings(['id', 'IO_group_id', 'mdisk_grp_id', 'FC_id', 'FC_name', 'RC_id', 'RC_name', 'vdisk_UID', 'RC_change',
          'parent_mdisk_grp_id', 'parent_mdisk_grp_name', 'volume_id', 'volume_name'], ''),
        ...strings(['fc_map_count', 'copy_count', 'se_copy_count', 'compressed_copy_count'], '0'),
        ...strings(['name', 'IO_group_name', 'mdisk_grp_name', 'capacity', 'type', 'fast_write_state', 'formatting', 'encrypt',
          'function', 'protocol'], '-'),
        status: str('unknown'),
        host_maps: { type: 'array', default: [], items: loose({ host_id: str(''), host_name: str('-'), cluster_name: str(''), scsi_id: str('') }) },
        is_snapshot_target: bool(false), has_snapshots: bool(false), snapshot_count: int(0), resolved: bool(false),
        role: { type: 'string', enum: ['source', 'target'] },
      }),
      VolumeTreeFcmapDetail: loose({
        ...strings(['id', 'source_vdisk_id', 'source_vdisk_name', 'target_vdisk_id', 'target_vdisk_name', 'group_id', 'group_name',
          'partner_FC_id', 'partner_FC_name', 'start_time', 'start_time_iso'], ''),
        ...strings(['progress', 'copy_rate', 'clean_progress'], '0'),
        ...strings(['name', 'incremental', 'restoring', 'rc_controlled'], '-'),
        status: str('unknown'),
      }),
      VolumeTreeConsistencyGroupDetail: loose({
        id: str(''), name: str('-'), status: str('unknown'), start_time: str(''), fc_mapping_count: int(0),
        pool_ids: { type: 'array', default: [], items: { type: 'string' } }, spans_pools: bool(false), is_synthetic: bool(false),
      }),
      VolumeTreeNode: {
        ...node,
        properties: {
          ...node.properties,
          kind: { type: 'string', enum: ['pool', 'volume', 'fcmap', 'consistency_group'] },
          detail: { anyOf: ['VolumeTreePoolDetail', 'VolumeTreeVolumeDetail', 'VolumeTreeFcmapDetail', 'VolumeTreeConsistencyGroupDetail'].map(ref) },
        },
      },
    })
  },
})
