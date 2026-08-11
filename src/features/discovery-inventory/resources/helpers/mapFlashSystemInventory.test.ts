import { describe, expect, it } from 'vitest'
import { flashSystemInventoryResponseSchema } from '../api/schemas/flashSystemInventorySchema'
import { mapFlashSystemInventory } from './mapFlashSystemInventory'

describe('mapFlashSystemInventory', () => {
  it('preserves resource provider identity from an aggregate response', () => {
    const payload = flashSystemInventoryResponseSchema.parse({
      count: 2,
      volumes: [
        { id: '0', name: 'volume-a', provider_id: 'flash-01' },
        { id: '0', name: 'volume-b', provider_id: 'flash-02' },
      ],
      pools: {},
      hosts: {},
      clusters: {},
    })

    const inventory = mapFlashSystemInventory(payload)

    expect(inventory.resources.map((resource) => resource.providerId)).toEqual([
      'flash-01',
      'flash-02',
    ])
    expect(inventory.resources[0]?.resourceId).not.toBe(inventory.resources[1]?.resourceId)
  })

  it('retains all volume fields and resolves pool and host relations', () => {
    const payload = flashSystemInventoryResponseSchema.parse({
      count: 1,
      volumes: [{
        id: '0', name: 'V5000_Volume1', status: 'online', capacity: '1.00TB',
        type: 'striped', vdisk_UID: 'uid-1', mdisk_grp_id: '0',
        mdisk_grp_name: 'Pool0', IO_group_id: '0', IO_group_name: 'io_grp0',
        FC_id: '', FC_name: '', RC_id: '', RC_name: '', fc_map_count: '2',
        copy_count: '1', fast_write_state: 'empty', se_copy_count: '0',
        RC_change: '', compressed_copy_count: '0', parent_mdisk_grp_id: '',
        parent_mdisk_grp_name: '', formatting: 'no', encrypt: 'no',
        volume_id: '0', volume_name: 'V5000_Volume1', function: 'generic',
        protocol: 'scsi', host_maps: [{ host_id: '0', scsi_id: '1' }],
      }],
      pools: { '0': { name: 'Pool0', capacity: '6.98TB', used_capacity: '6.02TB', free_capacity: '898.00GB' } },
      hosts: { '0': { name: 'HOST_esx', cluster_id: null, cluster_name: '' } },
      clusters: {},
    })
    const inventory = mapFlashSystemInventory(payload, 'flash-01')
    expect(inventory.resources[0]).toMatchObject({
      resourceId: 'flash-01:0',
      providerId: 'flash-01',
      capacityBytes: 1_000_000_000_000,
      pool: { name: 'Pool0' },
      resolvedHostMaps: [{ hostName: 'HOST_esx', scsi_id: '1' }],
      protocol: 'scsi',
      fc_map_count: '2',
    })
  })

  it('accepts missing IDs and creates unique stable resource identifiers', () => {
    const payload = flashSystemInventoryResponseSchema.parse({
      count: 2,
      volumes: [
        { name: 'volume-a', id: '', vdisk_UID: 'uid-a' },
        { name: 'volume-a', id: '', vdisk_UID: 'uid-a' },
      ],
      pools: {},
      hosts: {},
      clusters: {},
    })

    const inventory = mapFlashSystemInventory(payload, 'flash-01')

    expect(inventory.resources.map(({ resourceId }) => resourceId)).toEqual([
      'flash-01:uid-a',
      'flash-01:uid-a:2-1',
    ])
  })
})
