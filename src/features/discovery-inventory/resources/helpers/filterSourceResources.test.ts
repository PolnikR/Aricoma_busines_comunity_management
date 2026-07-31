import { describe, expect, it } from 'vitest'
import { filterPowerResources } from './filterSourceResources'
import type { PowerPartitionResource } from '../../model/discoveryTypes'

const partition: PowerPartitionResource = {
  id: 'provider:VIOS:1', providerId: 'provider', providerType: 'IBM_POWER',
  partitionKind: 'VIOS', partitionData: { IPAddress: '10.99.99.56' },
  lpar: {}, vios: {}, partitionName: 'vios1', partitionState: 'running',
  systemName: 'power-system', operatingSystemType: 'VIOS', deviceName: 'ent0',
  bootMode: 'Normal', powerOnWithHypervisor: 'true', volumeCapacity: '270648',
  volumeName: 'hdisk1', volumeState: 'active',
}

describe('filterPowerResources', () => {
  it('searches operational fields and applies structured filters', () => {
    expect(filterPowerResources([partition], {
      search: '10.99.99.56', providerId: 'provider', partitionKind: 'VIOS',
      partitionState: 'running', operatingSystemType: 'VIOS', volumeState: 'active',
    })).toEqual([partition])
    expect(filterPowerResources([partition], {
      search: '', providerId: '', partitionKind: 'LPAR', partitionState: '',
      operatingSystemType: '', volumeState: '',
    })).toEqual([])
  })
})
