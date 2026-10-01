import { definePatch, loose, ref, schemaOf, str, withSchemas } from './definePatch.mjs'

const volume = loose({
  provider_id: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  id: str(''), name: { type: 'string', minLength: 1 }, IO_group_id: str(''), IO_group_name: str('-'),
  status: str('unknown'), mdisk_grp_id: str(''), mdisk_grp_name: str('-'), capacity: str('-'), type: str('-'),
  FC_id: str(''), FC_name: str(''), RC_id: str(''), RC_name: str(''), vdisk_UID: str(''),
  fc_map_count: str('0'), copy_count: str('0'), fast_write_state: str('-'), se_copy_count: str('0'),
  RC_change: str(''), compressed_copy_count: str('0'), parent_mdisk_grp_id: str(''), parent_mdisk_grp_name: str(''),
  formatting: str('-'), encrypt: str('-'), volume_id: str(''), volume_name: str(''), function: str('-'), protocol: str('-'),
  host_maps: { type: 'array', default: [], items: loose({ host_id: str(), scsi_id: str() }, ['host_id', 'scsi_id']) },
  consistency_group_ids: { type: 'array', default: [], items: str() },
}, ['name'])

export default definePatch({
  name: 'flashSystemVolumes',
  isObsolete: spec => (schemaOf(spec, 'VolumesResponse').properties.volumes.items.$ref ? 'VolumesResponse.volumes is typed' : null),
  apply: (spec) => {
    const response = schemaOf(spec, 'VolumesResponse')
    const map = name => ({ type: 'object', default: {}, additionalProperties: ref(name) })
    return withSchemas(spec, {
      FlashSystemVolume: volume,
      FlashSystemPool: loose({ name: str('-'), capacity: str('-'), used_capacity: str('-'), free_capacity: str('-') }),
      FlashSystemHost: loose({ name: str('-'), cluster_id: { anyOf: [{ type: 'string' }, { type: 'null' }], default: null }, cluster_name: str('') }),
      FlashSystemCluster: loose({ name: str('-') }),
      FlashSystemConsistencyGroup: loose({ name: str('-'), status: str('') }),
      VolumesResponse: {
        ...response,
        properties: {
          ...response.properties,
          volumes: { type: 'array', items: ref('FlashSystemVolume') },
          pools: map('FlashSystemPool'),
          hosts: map('FlashSystemHost'),
          clusters: map('FlashSystemCluster'),
          consistency_groups: map('FlashSystemConsistencyGroup'),
        },
      },
    })
  },
})
