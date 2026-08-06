import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import {
  fetchFlashSystemInventory,
  fetchFlashSystemVolumeTree,
  fetchInventory,
  fetchPowerInventory,
  fetchVmwareInventory,
} from './discoveryInventoryApi'

const validPayload = {
  count: 1,
  vms: [
    {
      moId: 'vm-101',
      name: 'application-01',
      power_state: 'poweredOn',
      connection_state: 'connected',
      guest_os: 'Linux',
      guest_hostname: 'application-01',
      ip_address: '10.0.0.10',
      vcpu: 4,
      memory_gb: 8,
      host: 'esx-01',
      cluster: 'cluster-01',
      datastore: 'datastore-01',
      folder: 'Applications',
      vm_path: '[datastore-01] application-01/application-01.vmx',
      provider_id: 'vmware-vcenter-01',
      provider_type: 'VMWARE',
      vdisks: [
        {
          uuid: 'disk-101',
          label: 'Hard disk 1',
          capacity_gb: 100,
          datastore: 'datastore-02',
          file: '[datastore-02] application-01/disk.vmdk',
          thin_provisioned: true,
        },
      ],
      snapshot_count: 2,
      vmware_tools_status: 'toolsOk',
    },
  ],
}

describe('fetchVmwareInventory', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps a validated response to the canonical discovery model', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(validPayload), { status: 200 }),
    ))

    const inventory = await fetchVmwareInventory()

    expect(inventory.reportedCount).toBe(1)
    expect(inventory.virtualMachines[0]).toMatchObject({
      id: 'vmware-vcenter-01:vm-101',
      name: 'application-01',
      primaryDatastore: 'datastore-01',
    })
    expect(inventory.virtualMachines[0]?.disks[0]).toEqual({
      id: 'vmware-vcenter-01:vm-101:disk:disk-101',
      label: 'Hard disk 1',
      capacityGb: 100,
      datastore: 'datastore-02',
      filePath: '[datastore-02] application-01/disk.vmdk',
      thinProvisioned: true,
    })
  })

  it('requests without a provider filter by default', async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(validPayload), { status: 200 }))
    vi.stubGlobal('fetch', mock)

    await fetchVmwareInventory()

    const [url, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/vms')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
  })

  it('appends the provider_id query parameter when a provider is given', async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(validPayload), { status: 200 }))
    vi.stubGlobal('fetch', mock)

    await fetchVmwareInventory('vmware-vcenter-01')

    const [url, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/vms?provider_id=vmware-vcenter-01')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
  })

  it('uses the vms_by_tag endpoint when a tag is given', async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(validPayload), { status: 200 }))
    vi.stubGlobal('fetch', mock)

    await fetchVmwareInventory(undefined, 'WEB')

    const [url, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/vms_by_tag?tag=WEB')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
  })

  it('includes both tag and provider_id when both are given', async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(validPayload), { status: 200 }))
    vi.stubGlobal('fetch', mock)

    await fetchVmwareInventory('vmware-vcenter-01', 'WEB')

    const [url, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/vms_by_tag?tag=WEB&provider_id=vmware-vcenter-01')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
  })

  it('propagates a server failure for a filtered tag query', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })))

    await expect(fetchVmwareInventory(undefined, 'WEB')).rejects.toThrow(
      'Discovery inventory request failed with status 500',
    )
  })

  it('returns an empty inventory when a provider is rejected with 400', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "provider 'ibm-flashsystem-01' is not a VMWARE provider" }), { status: 400 }),
    ))

    const inventory = await fetchVmwareInventory('ibm-flashsystem-01')

    expect(inventory.reportedCount).toBe(0)
    expect(inventory.virtualMachines).toEqual([])
  })

  it('still throws on a 400 when no provider filter is set', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 400 })))

    await expect(fetchVmwareInventory()).rejects.toThrow(
      'Discovery inventory request failed with status 400',
    )
  })

  it('rejects a response that does not match the discovery contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 1, vms: 'invalid' }), { status: 200 }),
    ))

    await expect(fetchVmwareInventory()).rejects.toBeInstanceOf(Error)
  })

  it('reports an HTTP failure before parsing the response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 503 }),
    ))

    await expect(fetchVmwareInventory()).rejects.toThrow(
      'Discovery inventory request failed with status 503',
    )
  })
})

describe('IBM discovery inventory endpoints', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests all IBM Power inventory without a provider filter by default', async () => {
    const payload = {
      count: 0,
      counts_by_type: { LogicalPartition: 0, VirtualIOServer: 0 },
      vms: [],
    }
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', mock)

    await fetchPowerInventory()

    expect(mock.mock.calls[0]?.[0]).toBe('/api/get_power_vm')
  })

  it('requests all FlashSystem inventory without a provider filter by default', async () => {
    const payload = { count: 0, volumes: [], pools: {}, hosts: {}, clusters: {} }
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', mock)

    await fetchFlashSystemInventory()

    expect(mock.mock.calls[0]?.[0]).toBe('/api/get_volumes')
  })

  it('fetches and validates IBM Power inventory for the given provider', async () => {
    const payload = {
      count: 1,
      counts_by_type: {
        LogicalPartition: 0,
        VirtualIOServer: 1,
      },
      vms: [
        {
          lpar: {},
          vios: {
            PartitionUUID: 'power-uuid-1',
            PartitionName: 'vios1',
            PartitionType: 'Virtual IO Server',
            PartitionState: 'running',
            SystemName: 'power-system-1',
          },
        },
      ],
    }
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', mock)

    const inventory = await fetchPowerInventory('ibm-power-01')

    expect(mock.mock.calls[0]?.[0]).toBe('/api/get_power_vm?provider_id=ibm-power-01')
    expect(inventory).toMatchObject({
      reportedCount: 1,
      countsByType: {
        LogicalPartition: 0,
        VirtualIOServer: 1,
      },
    })
    expect(inventory.virtualMachines[0]?.vios.PartitionName).toBe('vios1')
  })

  it('fetches and validates FlashSystem volumes for the given provider', async () => {
    const payload = {
      count: 1,
      volumes: [
        {
          id: '0',
          name: 'V5000_Volume1',
          status: 'online',
          capacity: '3.00TB',
          type: 'striped',
          vdisk_UID: 'volume-uid-1',
          mdisk_grp_id: '0',
          mdisk_grp_name: 'Pool0',
          host_maps: [{ host_id: '0', scsi_id: '0' }],
        },
      ],
      pools: { 0: { name: 'Pool0', capacity: '6.98TB' } },
      hosts: { 0: { name: 'HOST_esx' } },
      clusters: {},
    }
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', mock)

    const inventory = await fetchFlashSystemInventory('ibm-flashsystem-01')

    expect(mock.mock.calls[0]?.[0]).toBe('/api/get_volumes?provider_id=ibm-flashsystem-01')
    expect(inventory.reportedCount).toBe(1)
    expect(inventory.volumes[0]).toMatchObject({
      name: 'V5000_Volume1',
      status: 'online',
      mdisk_grp_name: 'Pool0',
    })
    expect(inventory.hosts['0']?.name).toBe('HOST_esx')
  })

  it('reports an IBM Power HTTP failure before parsing the response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))

    await expect(fetchPowerInventory('ibm-power-01')).rejects.toThrow(
      'IBM Power inventory request failed with status 503',
    )
  })

  it('rejects a FlashSystem response that does not match its contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 1, volumes: 'invalid' }), { status: 200 }),
    ))

    await expect(fetchFlashSystemInventory('ibm-flashsystem-01')).rejects.toBeInstanceOf(Error)
  })
})

describe('fetchFlashSystemVolumeTree', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const flatViewPayload = {
    counts: { pools: 2, volumes: 46, fcmaps: 42, consistency_groups: 21 },
    views: {
      flat: [
        {
          kind: 'pool',
          id: '0',
          name: 'Pool0',
          key: 'pool:0',
          detail: { id: '0', name: 'Pool0', status: 'online', volume_count: 46 },
          children: [
            {
              kind: 'volume',
              id: '0',
              name: 'V5000_VOLUME01',
              key: 'pool:0/volume:0',
              detail: {
                id: '0',
                name: 'V5000_VOLUME01',
                status: 'online',
                capacity: '1.00TB',
                host_maps: [],
                is_snapshot_target: false,
                has_snapshots: true,
                snapshot_count: 21,
                resolved: true,
              },
              children: [],
            },
          ],
        },
      ],
    },
    provider_id: 'ibm-flashsystem-01',
    provider_type: 'FLASHCOPY',
  }

  it('requests the volume tree with provider_id and view query params', async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(flatViewPayload), { status: 200 }))
    vi.stubGlobal('fetch', mock)

    await fetchFlashSystemVolumeTree('ibm-flashsystem-01', 'flat')

    expect(mock.mock.calls[0]?.[0]).toBe('/api/get_volume_tree?provider_id=ibm-flashsystem-01&view=flat')
  })

  it('parses the requested view into counts and a flat node array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(flatViewPayload), { status: 200 }),
    ))

    const tree = await fetchFlashSystemVolumeTree('ibm-flashsystem-01', 'flat')

    expect(tree.counts).toEqual({ pools: 2, volumes: 46, fcmaps: 42, consistency_groups: 21 })
    expect(tree.nodes).toHaveLength(1)
    expect(tree.nodes[0]).toMatchObject({ kind: 'pool', id: '0', name: 'Pool0' })
  })

  it('returns an empty node array when the requested view is absent from the response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(flatViewPayload), { status: 200 }),
    ))

    const tree = await fetchFlashSystemVolumeTree('ibm-flashsystem-01', 'snapshot')

    expect(tree.nodes).toEqual([])
  })

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))

    await expect(fetchFlashSystemVolumeTree('ibm-flashsystem-01', 'flat')).rejects.toThrow(
      'FlashSystem volume tree request failed with status 503',
    )
  })

  it('rejects a response that does not match its contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ counts: {}, views: {}, provider_type: 'NOT_FLASHCOPY' }), { status: 200 }),
    ))

    await expect(fetchFlashSystemVolumeTree('ibm-flashsystem-01', 'flat')).rejects.toBeInstanceOf(Error)
  })
})

describe('fetchInventory', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const provider = (type: ProviderRecord['type'], id: string): ProviderRecord => ({
    id,
    name: id,
    description: '',
    type,
    ipAddress: '10.0.0.1',
    credentialId: 'credential-1',
    credentialStatus: 'ok',
  })

  it('dispatches VMware providers to the VMware inventory endpoint', async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(validPayload), { status: 200 }))
    vi.stubGlobal('fetch', mock)

    const result = await fetchInventory(provider('VMWARE', 'vmware-vcenter-01'))

    expect(result.source).toBe('vmware')
    expect(mock.mock.calls[0]?.[0]).toBe('/api/vms?provider_id=vmware-vcenter-01')
  })

  it('dispatches IBM Power providers to the Power inventory endpoint', async () => {
    const payload = {
      count: 0,
      counts_by_type: { LogicalPartition: 0, VirtualIOServer: 0 },
      vms: [],
    }
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', mock)

    const result = await fetchInventory(provider('IBM_POWER', 'ibm-power-01'))

    expect(result.source).toBe('power')
    expect(mock.mock.calls[0]?.[0]).toBe('/api/get_power_vm?provider_id=ibm-power-01')
  })

  it('dispatches FlashCopy providers to the FlashSystem inventory endpoint', async () => {
    const payload = { count: 0, volumes: [], pools: {}, hosts: {}, clusters: {} }
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', mock)

    const result = await fetchInventory(provider('FLASHCOPY', 'ibm-flashsystem-01'))

    expect(result.source).toBe('flashsystem')
    expect(mock.mock.calls[0]?.[0]).toBe('/api/get_volumes?provider_id=ibm-flashsystem-01')
  })
})
