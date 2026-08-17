import { describe, expect, it } from 'vitest'
import type { PowerInventory, PowerPartitionResource } from '../../model/discoveryTypes'
import { mapPowerInventoryToTopology } from './mapPowerInventoryToTopology'

function partition(
  overrides: Partial<PowerPartitionResource> = {},
): PowerPartitionResource {
  return {
    id: 'power-01:LPAR:lpar-01',
    providerId: 'power-01',
    providerType: 'IBM_POWER',
    partitionKind: 'LPAR',
    partitionData: {},
    lpar: {},
    vios: {},
    partitionName: 'application-lpar',
    partitionState: 'running',
    systemName: 'power-system-01',
    operatingSystemType: 'AIX',
    deviceName: '',
    bootMode: 'Normal',
    powerOnWithHypervisor: 'true',
    volumeCapacity: '',
    volumeName: '',
    volumeState: '',
    ...overrides,
  }
}

function inventory(partitions: PowerPartitionResource[]): PowerInventory {
  return {
    reportedCount: partitions.length,
    countsByType: {
      LogicalPartition: partitions.filter(({ partitionKind }) => partitionKind === 'LPAR').length,
      VirtualIOServer: partitions.filter(({ partitionKind }) => partitionKind === 'VIOS').length,
    },
    virtualMachines: [],
    partitions,
  }
}

describe('mapPowerInventoryToTopology', () => {
  it('groups LPAR and VIOS partitions under their managed system', () => {
    const topology = mapPowerInventoryToTopology(inventory([
      partition(),
      partition({
        id: 'power-01:VIOS:vios-01',
        partitionKind: 'VIOS',
        partitionName: 'vios-01',
        operatingSystemType: 'VIOS',
        deviceName: 'ent0',
        volumeName: 'hdisk1',
      }),
    ]))

    expect(topology.nodes).toHaveLength(3)
    expect(topology.nodes.find(({ kind }) => kind === 'powerSystem')).toMatchObject({
      label: 'power-system-01',
      partitionCount: 2,
      lparCount: 1,
      viosCount: 1,
    })
    expect(topology.nodes.filter(({ kind }) => kind === 'powerPartition')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'application-lpar', partitionKind: 'LPAR' }),
        expect.objectContaining({ label: 'vios-01', partitionKind: 'VIOS' }),
      ]),
    )
    expect(topology.edges).toHaveLength(2)
    expect(topology.edges.every(({ kind }) => kind === 'contains')).toBe(true)
  })

  it('keeps systems with identical names separate between providers', () => {
    const topology = mapPowerInventoryToTopology(inventory([
      partition(),
      partition({
        id: 'power-02:LPAR:lpar-01',
        providerId: 'power-02',
        partitionName: 'other-lpar',
      }),
    ]))

    expect(topology.nodes.filter(({ kind }) => kind === 'powerSystem')).toHaveLength(2)
  })

  it('keeps a partition with no system name visible without inventing a parent', () => {
    const topology = mapPowerInventoryToTopology(inventory([
      partition({ systemName: '' }),
    ]))

    expect(topology.nodes).toHaveLength(1)
    expect(topology.nodes[0]).toMatchObject({ kind: 'powerPartition' })
    expect(topology.edges).toEqual([])
  })
})
