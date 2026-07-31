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

  it('normalizes VIOS data and keeps volume capacity unitless', () => {
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

    expect(inventory.partitions[0]).toMatchObject({
      id: 'power-01:VIOS:partition-1',
      partitionKind: 'VIOS',
      partitionName: 'vios1',
      volumeCapacity: '270648',
      providerId: 'power-01',
    })
    expect(inventory.partitions[0]?.partitionData['State']).toBe('Inactive')
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

    expect(inventory.partitions.map(({ id }) => id)).toEqual([
      'power-01:VIOS:vios1',
      'power-01:VIOS:vios1:2-1',
    ])
    expect(new Set(inventory.partitions.map(({ id }) => id)).size).toBe(2)
  })
})
