import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchDiscoveryInventory } from './discoveryInventoryApi'

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
