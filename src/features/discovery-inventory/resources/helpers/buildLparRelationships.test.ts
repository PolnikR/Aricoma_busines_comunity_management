import { describe, expect, it } from 'vitest'
import type { PowerPartitionResource } from '../model/discoveryTypes'
import type { StorageVolume } from '../model/vmStorageVolumesTypes'
import { buildLparRelationships } from './buildLparRelationships'

const lpar = {
  id: 'ibm-power-01:LPAR:2',
  providerId: 'ibm-power-01',
  partitionKind: 'LPAR',
  partitionName: 'aix2source',
  partitionState: 'running',
} as unknown as PowerPartitionResource

function volume(key: string, storageProviderId: string, volumeId: string): StorageVolume {
  return {
    key,
    naa: null,
    volumeId,
    id: volumeId,
    name: `vol-${volumeId}`,
    volumeName: `vol-${volumeId}`,
    capacity: '30.00GB',
    status: 'online',
    pool: 'Pool0',
    ioGroupName: 'io_grp0',
    storageProviderId,
    type: 'striped',
    protocol: 'scsi',
    vdiskUid: `UID${volumeId}`,
    copyCount: '1',
    fcMapCount: '0',
    snapshots: { hasSnapshots: false, snapshotCount: 0, isSnapshot: false, sourceMappings: [], targetMappings: [] },
  }
}

describe('buildLparRelationships', () => {
  it('links the IBM Power provider, the LPAR and its volumes from several FlashSystems', () => {
    const result = buildLparRelationships(lpar, [
      volume('ibm-flashsystem-02:2', 'ibm-flashsystem-02', '2'),
      volume('ibm-flashsystem-01:100', 'ibm-flashsystem-01', '100'),
    ], [])

    expect(result.computeProvider.entityId).toBe('provider:ibm-power-01')
    expect(result.workload).toEqual({ entityId: 'lpar:ibm-power-01:LPAR:2', name: 'aix2source', state: 'running' })
    expect(result.groups.map(group => [group.storage.providerId, group.rows.map(row => row.volume.volumeId)])).toEqual([
      ['ibm-flashsystem-02', ['2']],
      ['ibm-flashsystem-01', ['100']],
    ])
    expect(result.edges.filter(edge => edge.relation === 'backing').map(edge => edge.to)).toEqual([
      'volume:ibm-flashsystem-02:2',
      'volume:ibm-flashsystem-01:100',
    ])
  })

  it('never turns an IBM Power volume key into an NAA', () => {
    const [row] = buildLparRelationships(lpar, [volume('ibm-flashsystem-02:2', 'ibm-flashsystem-02', '2')], []).groups[0]?.rows ?? []

    expect(row?.volume.naa).toBeNull()
  })
})
