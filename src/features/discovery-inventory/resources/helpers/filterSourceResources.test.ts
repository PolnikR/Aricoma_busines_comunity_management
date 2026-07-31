import { describe, expect, it } from 'vitest'
import {
  filterFlashSystemResources,
  filterPowerResources,
  getFlashSystemFilterOptions,
} from './filterSourceResources'
import type { FlashSystemVolumeResource, PowerPartitionResource } from '../../model/discoveryTypes'

const partition: PowerPartitionResource = {
  id: 'provider:VIOS:1', providerId: 'provider', providerType: 'IBM_POWER',
  partitionKind: 'VIOS', partitionData: { IPAddress: '10.99.99.56' },
  lpar: {}, vios: {}, partitionName: 'vios1', partitionState: 'running',
  systemName: 'power-system', operatingSystemType: 'VIOS', deviceName: 'ent0',
  bootMode: 'Normal', powerOnWithHypervisor: 'true', volumeCapacity: '270648',
  volumeName: 'hdisk1', volumeState: 'active',
}

describe('filterPowerResources', () => {
  it('searches operational fields and applies structured filters', () => {
    expect(filterPowerResources([partition], {
      search: '10.99.99.56', providerId: 'provider', partitionKind: 'VIOS',
      partitionState: 'running', operatingSystemType: 'VIOS', volumeState: 'active',
    })).toEqual([partition])
    expect(filterPowerResources([partition], {
      search: '', providerId: '', partitionKind: 'LPAR', partitionState: '',
      operatingSystemType: '', volumeState: '',
    })).toEqual([])
  })
})

function flashResource(providerId: string, name: string): FlashSystemVolumeResource {
  return {
    id: '0',
    resourceId: `${providerId}:0`,
    providerId,
    providerType: 'FLASHCOPY',
    name,
    IO_group_id: '0',
    IO_group_name: 'io_grp0',
    status: 'online',
    mdisk_grp_id: '0',
    mdisk_grp_name: 'Pool0',
    capacity: '1TB',
    type: 'striped',
    FC_id: '',
    FC_name: '',
    RC_id: '',
    RC_name: '',
    vdisk_UID: `${providerId}-uid`,
    fc_map_count: '0',
    copy_count: '1',
    fast_write_state: '-',
    se_copy_count: '0',
    RC_change: '',
    compressed_copy_count: '0',
    parent_mdisk_grp_id: '',
    parent_mdisk_grp_name: '',
    formatting: 'no',
    encrypt: 'no',
    volume_id: '0',
    volume_name: name,
    function: 'generic',
    protocol: 'scsi',
    host_maps: [{ host_id: '0', scsi_id: '0' }],
    pool: { name: 'Pool0', capacity: '1TB', used_capacity: '0', free_capacity: '1TB' },
    resolvedHostMaps: [{
      host_id: '0', scsi_id: '0', hostName: 'HOST_esx', clusterId: null, clusterName: '',
    }],
    capacityBytes: 1_000_000_000_000,
  }
}

describe('FlashSystem provider-scoped filters', () => {
  it('keeps identical pool and host IDs isolated between providers', () => {
    const resources = [flashResource('flash-a', 'volume-a'), flashResource('flash-b', 'volume-b')]
    const options = getFlashSystemFilterOptions(resources)

    expect(options.pools).toHaveLength(2)
    expect(options.hosts).toHaveLength(2)
    expect(filterFlashSystemResources(resources, {
      search: '',
      providerId: '',
      poolId: options.pools[0]?.id ?? '',
      hostId: options.hosts[0]?.id ?? '',
      status: '',
    })).toEqual([resources[0]])
  })
})
