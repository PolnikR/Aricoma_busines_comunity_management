import { bool, definePatch, int, ref, schemaOf, str, withSchemas } from './definePatch.mjs'

const mapping = {
  type: 'object',
  properties: {
    id: str(''), name: str(''), source_vdisk_id: str(''), source_vdisk_name: str(''), target_vdisk_id: str(''),
    target_vdisk_name: str(''), status: str('-'), progress: str('0'), copy_rate: str('0'), clean_progress: str('0'), start_time: str(''),
  },
}

export default definePatch({
  name: 'vdisksByVm',
  isObsolete: spec => (schemaOf(spec, 'VdisksByVmResponse').properties.vdisks.additionalProperties?.$ref ? 'VdisksByVmResponse.vdisks is typed' : null),
  apply: (spec) => {
    const response = schemaOf(spec, 'VdisksByVmResponse')
    return withSchemas(spec, {
      StorageVolumeMapping: mapping,
      StorageVolumeSnapshots: {
        type: 'object',
        properties: {
          has_snapshots: bool(false), snapshot_count: int(0), is_snapshot: bool(false),
          source_mappings: { type: 'array', default: [], items: ref('StorageVolumeMapping') },
          target_mappings: { type: 'array', default: [], items: ref('StorageVolumeMapping') },
        },
      },
      StorageVolume: {
        type: 'object',
        properties: {
          id: str(''), name: str(''), volume_name: str(''), capacity: str('-'), status: str('-'), mdisk_grp_name: str('-'),
          type: str('-'), protocol: str('-'), vdisk_UID: str(''), copy_count: str('0'), fc_map_count: str('0'),
          // Backend field name is misspelled; kept as the wire name.
          sanpshosts: ref('StorageVolumeSnapshots'),
        },
      },
      VdisksByVmResponse: {
        ...response,
        properties: { ...response.properties, vdisks: { type: 'object', default: {}, additionalProperties: ref('StorageVolume') } },
      },
    })
  },
})
