import { describe, expect, it } from 'vitest'
import type { VdisksByVmResponseOutput } from '@/generated/query/zod'
import { mapVdisks } from './mapVmStorageVolumes'

const mapping = {
  id: '0',
  name: 'fcmap0',
  source_vdisk_id: '1',
  source_vdisk_name: 'V5000_VOLUME02',
  target_vdisk_id: '7',
  target_vdisk_name: 'V5000_VOLUME02_SNAP',
  status: 'copying',
  progress: '40',
  copy_rate: '50',
  clean_progress: '100',
  start_time: '260724200509',
}

function payload(volume: Record<string, unknown>): VdisksByVmResponseOutput {
  // Received payloads keep fields the spec does not list (validatingMutator).
  const response = {
    name: 'TEST-WEB02',
    count_vm: 1,
    count_ibm: 1,
    vdisks: {
      'naa.60050763808104d94000000000000016': {
        id: '1',
        name: 'V5000_VOLUME02',
        volume_name: 'V5000_VOLUME02',
        capacity: '1.00TB',
        status: 'degraded',
        mdisk_grp_name: 'Pool0',
        type: 'striped',
        protocol: 'scsi',
        vdisk_UID: '60050763808104D94000000000000016',
        copy_count: '1',
        fc_map_count: '0',
        sanpshosts: {
          has_snapshots: false,
          snapshot_count: 0,
          is_snapshot: false,
          source_mappings: [],
          target_mappings: [],
        },
        ...volume,
      },
    },
    warnings: [],
  }
  return response
}

describe('mapVdisks', () => {
  it('maps the backing provider and I/O group kept from the received payload', () => {
    const [volume] = mapVdisks(payload({
      IO_group_id: '0',
      IO_group_name: 'io_grp0',
      storage_provider_id: 'ibm-flashsystem-01',
    })).volumes

    expect(volume).toMatchObject({
      naaId: 'naa.60050763808104d94000000000000016',
      volumeName: 'V5000_VOLUME02',
      storageProviderId: 'ibm-flashsystem-01',
      ioGroupName: 'io_grp0',
      pool: 'Pool0',
      snapshots: { snapshotCount: 0, sourceMappings: [], targetMappings: [] },
    })
  })

  it('falls back to empty text when the backend omits the unlisted fields', () => {
    const [volume] = mapVdisks(payload({})).volumes

    expect(volume?.storageProviderId).toBe('')
    expect(volume?.ioGroupName).toBe('')
  })

  it('maps both source and target FlashCopy mappings', () => {
    const [volume] = mapVdisks(payload({
      sanpshosts: {
        has_snapshots: true,
        snapshot_count: 1,
        is_snapshot: true,
        source_mappings: [mapping],
        target_mappings: [{ ...mapping, id: '1' }],
      },
    })).volumes

    expect(volume?.snapshots.sourceMappings).toEqual([expect.objectContaining({ id: '0', targetVdiskName: 'V5000_VOLUME02_SNAP', cleanProgress: '100' })])
    expect(volume?.snapshots.targetMappings).toEqual([expect.objectContaining({ id: '1', sourceVdiskName: 'V5000_VOLUME02' })])
  })
})
