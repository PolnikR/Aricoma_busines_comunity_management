import { describe, expect, it } from 'vitest'
import {
  filterFlashSystemResources,
  filterPowerResources,
  getFlashSystemFilterOptions,
} from './filterSourceResources'
import { buildFlashSystemHostSummaries } from './buildFlashSystemHostSummaries'
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
      search: '10.99.99.56', partitionKind: 'VIOS',
      partitionState: 'running', operatingSystemType: 'VIOS', volumeState: 'active',
    })).toEqual([partition])
    expect(filterPowerResources([partition], {
      search: '', partitionKind: 'LPAR', partitionState: '',
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
      poolId: options.pools[0]?.id ?? '',
      hostId: options.hosts[0]?.id ?? '',
      status: '',
    })).toEqual([resources[0]])
  })
})

describe('buildFlashSystemHostSummaries', () => {
  it('aggregates unique mapped volumes without crossing provider boundaries', () => {
    const first = {
      ...flashResource('flash-a', 'volume-a'),
      resourceId: 'flash-a:volume-a',
      capacityBytes: 1_000_000_000_000,
    }
    const second = {
      ...flashResource('flash-a', 'volume-b'),
      resourceId: 'flash-a:volume-b',
      capacityBytes: 2_000_000_000_000,
      host_maps: [{ host_id: '0', scsi_id: '2' }],
      resolvedHostMaps: [{
        host_id: '0',
        scsi_id: '2',
        hostName: 'HOST_esx',
        clusterId: 'cluster-a',
        clusterName: 'Cluster A',
      }],
    }
    const otherProvider = {
      ...flashResource('flash-b', 'volume-c'),
      resourceId: 'flash-b:volume-c',
    }

    const summaries = buildFlashSystemHostSummaries([
      first,
      first,
      second,
      otherProvider,
    ])

    expect(summaries).toHaveLength(2)
    expect(summaries.get('flash-a:0')).toMatchObject({
      providerId: 'flash-a',
      hostId: '0',
      name: 'HOST_esx',
      clusterId: 'cluster-a',
      clusterName: 'Cluster A',
      totalCapacityBytes: 3_000_000_000_000,
      mappedVolumes: [
        { resourceId: 'flash-a:volume-a', name: 'volume-a', scsiId: '0' },
        { resourceId: 'flash-a:volume-b', name: 'volume-b', scsiId: '2' },
      ],
    })
    expect(summaries.get('flash-b:0')?.mappedVolumes).toHaveLength(1)
  })
})
