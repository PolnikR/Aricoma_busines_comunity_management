import { describe, expect, it } from 'vitest'
import { powerInventoryResponseSchema } from '../api/schemas/powerInventorySchema'
import { mapPowerInventory } from './mapPowerInventory'

describe('mapPowerInventory', () => {
  it('preserves resource provider identity from an aggregate response', () => {
    const payload = powerInventoryResponseSchema.parse({
      count: 2,
      counts_by_type: { LogicalPartition: 2, VirtualIOServer: 0 },
      vms: [
        {
          provider_id: 'power-01',
          lpar: { PartitionUUID: 'shared-id', PartitionName: 'lpar-a' },
          vios: {},
        },
        {
          provider_id: 'power-02',
          lpar: { PartitionUUID: 'shared-id', PartitionName: 'lpar-b' },
          vios: {},
        },
      ],
    })

    const inventory = mapPowerInventory(payload)

    expect(inventory.partitions.map((partition) => partition.providerId)).toEqual([
      'power-01',
      'power-02',
    ])
    expect(inventory.partitions[0]?.id).not.toBe(inventory.partitions[1]?.id)
  })

  it('excludes VIOS-only records from normalized inventory', () => {
    const inventory = mapPowerInventory({
      count: 1,
      counts_by_type: { LogicalPartition: 0, VirtualIOServer: 1 },
      vms: [{
        lpar: {},
        vios: {
          PartitionUUID: 'partition-1',
          PartitionName: 'vios1',
          PartitionState: 'running',
          OperatingSystemType: 'VIOS',
          DeviceName: 'ent0',
          BootMode: 'Normal',
          PowerOnWithHypervisor: 'true',
          VolumeCapacity: '270648',
          VolumeName: 'hdisk1',
          VolumeState: 'active',
          State: 'Inactive',
        },
      }],
    }, 'power-01')

    expect(inventory.partitions).toEqual([])
  })

  it('prefers a populated LPAR deterministically and ignores empty records', () => {
    const inventory = mapPowerInventory({
      count: 2,
      counts_by_type: { LogicalPartition: 1, VirtualIOServer: 1 },
      vms: [
        { lpar: { PartitionName: 'lpar1' }, vios: { PartitionName: 'vios1' } },
        { lpar: {}, vios: {} },
      ],
    })
    expect(inventory.partitions).toHaveLength(1)
    expect(inventory.partitions[0]?.partitionKind).toBe('LPAR')
  })

  it('falls through empty identities and keeps duplicate row identifiers unique', () => {
    const inventory = mapPowerInventory({
      count: 2,
      counts_by_type: { LogicalPartition: 0, VirtualIOServer: 2 },
      vms: [
        { lpar: {}, vios: { PartitionUUID: ' ', PartitionName: 'vios1' } },
        { lpar: {}, vios: { PartitionUUID: '', PartitionName: 'vios1' } },
      ],
    }, 'power-01')

    expect(inventory.partitions).toEqual([])
  })
})
