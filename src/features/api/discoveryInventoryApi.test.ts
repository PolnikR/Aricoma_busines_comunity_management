import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchDiscoveryInventory } from '@/features/api/discoveryInventoryApi'

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

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchDiscoveryInventory', () => {
  it('maps a validated response to the canonical discovery model', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(validPayload), { status: 200 }),
    ))

    const inventory = await fetchDiscoveryInventory()

    expect(inventory.reportedCount).toBe(1)
    expect(inventory.virtualMachines[0]).toMatchObject({
      id: 'vm-101',
      name: 'application-01',
      primaryDatastore: 'datastore-01',
    })
    expect(inventory.virtualMachines[0]?.disks[0]).toEqual({
      id: 'disk-101',
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

    await fetchDiscoveryInventory()

    expect(mock).toHaveBeenCalledWith('/api/vms', { headers: { Accept: 'application/json' } })
  })

  it('appends the provider_id query parameter when a provider is given', async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(validPayload), { status: 200 }))
    vi.stubGlobal('fetch', mock)

    await fetchDiscoveryInventory('vmware-vcenter-01')

    expect(mock).toHaveBeenCalledWith('/api/vms?provider_id=vmware-vcenter-01', { headers: { Accept: 'application/json' } })
  })

  it('returns an empty inventory when a provider is rejected with 400', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "provider 'ibm-flashsystem-01' is not a VMWARE provider" }), { status: 400 }),
    ))

    const inventory = await fetchDiscoveryInventory('ibm-flashsystem-01')

    expect(inventory.reportedCount).toBe(0)
    expect(inventory.virtualMachines).toEqual([])
  })

  it('still throws on a 400 when no provider filter is set', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 400 })))

    await expect(fetchDiscoveryInventory()).rejects.toThrow(
      'Discovery inventory request failed with status 400',
    )
  })

  it('rejects a response that does not match the discovery contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 1, vms: 'invalid' }), { status: 200 }),
    ))

    await expect(fetchDiscoveryInventory()).rejects.toBeInstanceOf(Error)
  })

  it('reports an HTTP failure before parsing the response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 503 }),
    ))

    await expect(fetchDiscoveryInventory()).rejects.toThrow(
      'Discovery inventory request failed with status 503',
    )
  })
})
