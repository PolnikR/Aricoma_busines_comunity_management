import { describe, expect, it } from 'vitest'
import { discoveryInventoryKeys } from './discoveryInventoryQueryKeys'

describe('discoveryInventoryKeys', () => {
  it('builds stable inventory, tag, and vdisk query keys', () => {
    expect(discoveryInventoryKeys.all).toEqual(['discovery-inventory'])
    expect(discoveryInventoryKeys.inventory()).toEqual([
      'discovery-inventory', 'inventory', null, null,
    ])
    expect(discoveryInventoryKeys.inventory('provider-1', 'prod')).toEqual([
      'discovery-inventory', 'inventory', 'provider-1', 'prod',
    ])
    expect(discoveryInventoryKeys.tags()).toEqual(['discovery-inventory', 'tags'])
    expect(discoveryInventoryKeys.vdisksByVm('VM-01')).toEqual([
      'discovery-inventory', 'vdisks', 'VM-01', null,
    ])
  })
})
