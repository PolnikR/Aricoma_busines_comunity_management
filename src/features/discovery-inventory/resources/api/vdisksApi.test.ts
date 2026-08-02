import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchVdisksByVm } from './vdisksApi'

const validPayload = {
  name: 'TEST-WEB02',
  count_vm: 1,
  count_ibm: 1,
  vdisks: {
    'naa.60050763808104d94000000000000005': {
      id: '1',
      name: 'V5000_Volume2',
      status: 'online',
      mdisk_grp_name: 'Pool0',
      capacity: '3.00TB',
      type: 'striped',
      vdisk_UID: '60050763808104D94000000000000005',
      fc_map_count: '2',
      copy_count: '1',
      volume_name: 'V5000_Volume2',
      protocol: 'scsi',
      sanpshosts: {
        has_snapshots: true,
        snapshot_count: 2,
        is_snapshot: false,
        source_mappings: [
          { id: '0', name: 'fcmap0', source_vdisk_id: '1', source_vdisk_name: 'V5000_Volume2', target_vdisk_id: '2', target_vdisk_name: 'V5000_Volume2_01', status: 'copying', progress: '1', copy_rate: '0', clean_progress: '100', start_time: '260618102618' },
          { id: '1', name: 'fcmap1', source_vdisk_id: '1', source_vdisk_name: 'V5000_Volume2', target_vdisk_id: '3', target_vdisk_name: 'V5000_Volume2_02', status: 'copying', progress: '0', copy_rate: '0', clean_progress: '99', start_time: '260721090818' },
        ],
        target_mappings: [],
      },
    },
  },
}

function stubFetch(payload: unknown, status = 200) {
  const mock = vi.fn().mockResolvedValue(new Response(payload === null ? null : JSON.stringify(payload), { status }))
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('fetchVdisksByVm', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests with vm_name only when no provider is given and maps volumes', async () => {
    const mock = stubFetch(validPayload)

    const result = await fetchVdisksByVm('TEST-WEB02')

    const [url, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/vdisks_by_vm?vm_name=TEST-WEB02')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
    expect(result).toMatchObject({ vmName: 'TEST-WEB02', countVm: 1, countIbm: 1 })
    expect(result.volumes).toHaveLength(1)
    expect(result.volumes[0]).toEqual({
      naaId: 'naa.60050763808104d94000000000000005',
      id: '1',
      name: 'V5000_Volume2',
      volumeName: 'V5000_Volume2',
      capacity: '3.00TB',
      status: 'online',
      pool: 'Pool0',
      type: 'striped',
      protocol: 'scsi',
      vdiskUid: '60050763808104D94000000000000005',
      copyCount: '1',
      fcMapCount: '2',
      snapshots: {
        hasSnapshots: true,
        snapshotCount: 2,
        isSnapshot: false,
        sourceMappings: [
          {
            id: '0',
            name: 'fcmap0',
            sourceVdiskId: '1',
            sourceVdiskName: 'V5000_Volume2',
            targetVdiskId: '2',
            targetVdiskName: 'V5000_Volume2_01',
            status: 'copying',
            progress: '1',
            copyRate: '0',
            cleanProgress: '100',
            startTime: '260618102618',
          },
          {
            id: '1',
            name: 'fcmap1',
            sourceVdiskId: '1',
            sourceVdiskName: 'V5000_Volume2',
            targetVdiskId: '3',
            targetVdiskName: 'V5000_Volume2_02',
            status: 'copying',
            progress: '0',
            copyRate: '0',
            cleanProgress: '99',
            startTime: '260721090818',
          },
        ],
        targetMappings: [],
      },
    })
  })

  it('sends both VMware and FlashSystem provider identifiers', async () => {
    const mock = stubFetch(validPayload)

    await fetchVdisksByVm('TEST-WEB02', 'vmware-vcenter-01', 'ibm-flashsystem-01')

    const [url, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/vdisks_by_vm?vm_name=TEST-WEB02&provider_id=vmware-vcenter-01&ibm_provider_id=ibm-flashsystem-01')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
  })

  it('defaults snapshot info when sanpshosts is absent', async () => {
    stubFetch({
      name: 'VM', count_vm: 1, count_ibm: 1,
      vdisks: { 'naa.1': { id: '9', name: 'Vol', volume_name: 'Vol', capacity: '1.00TB', status: 'online', mdisk_grp_name: 'P', type: 'striped', vdisk_UID: 'X', copy_count: '1', fc_map_count: '0', protocol: 'scsi' } },
    })

    const result = await fetchVdisksByVm('VM')

    expect(result.volumes[0]?.snapshots).toEqual({
      hasSnapshots: false, snapshotCount: 0, isSnapshot: false, sourceMappings: [], targetMappings: [],
    })
  })

  it('throws on an HTTP failure', async () => {
    stubFetch(null, 500)

    await expect(fetchVdisksByVm('TEST-WEB02')).rejects.toThrow('Vdisks request failed with status 500')
  })
})
