import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchDiscoveryInventory } from '@/features/api/discoveryInventoryApi'
import type { DiscoveryInventory } from '../../model/discoveryTypes'
import { fetchInfrastructureTopology } from './infrastructureTopologyApi'

vi.mock('@/features/api/discoveryInventoryApi', () => ({
  fetchDiscoveryInventory: vi.fn(),
}))

const inventory: DiscoveryInventory = {
  reportedCount: 1,
  virtualMachines: [
    {
      id: 'vm-101',
      name: 'application-01',
      powerState: 'poweredOn',
      connectionState: 'connected',
      guestOs: 'Linux',
      hostname: 'application-01',
      ipAddress: '10.0.0.10',
      vcpu: 4,
      memoryGb: 8,
      host: 'esx-01',
      cluster: 'cluster-01',
      primaryDatastore: 'datastore-01',
      folder: 'Applications',
      disks: [],
      snapshotCount: 0,
      toolsStatus: 'toolsOk',
      tags: [],
    },
  ],
}

beforeEach(() => {
  vi.mocked(fetchDiscoveryInventory).mockReset()
})

describe('fetchInfrastructureTopology', () => {
  it('maps the complete discovery inventory to a topology graph', async () => {
    vi.mocked(fetchDiscoveryInventory).mockResolvedValue(inventory)

    const topology = await fetchInfrastructureTopology()

    expect(fetchDiscoveryInventory).toHaveBeenCalledOnce()
    expect(topology.nodes.map((node) => node.kind)).toEqual([
      'cluster',
      'host',
      'virtualMachine',
      'datastore',
    ])
    expect(topology.edges).toHaveLength(3)
  })

  it('propagates discovery loading failures to the query layer', async () => {
    vi.mocked(fetchDiscoveryInventory).mockRejectedValue(
      new Error('Discovery endpoint unavailable'),
    )

    await expect(fetchInfrastructureTopology()).rejects.toThrow(
      'Discovery endpoint unavailable',
    )
  })
})
