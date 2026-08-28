import { describe, expect, it } from 'vitest'
import { discoveryInventoryKeys } from './resourceInventoryQueryKeys'

describe('discoveryInventoryKeys', () => {
  it('builds stable inventory, tag, and vdisk query keys', () => {
    expect(discoveryInventoryKeys.all).toEqual(['discovery-inventory'])
    expect(discoveryInventoryKeys.inventory()).toEqual([
      'discovery-inventory', 'inventory', null, null,
    ])
    expect(discoveryInventoryKeys.inventory('provider-1', 'prod')).toEqual([
      'discovery-inventory', 'inventory', 'provider-1', 'prod',
    ])
    expect(discoveryInventoryKeys.tags()).toEqual(['discovery-inventory', 'tags', null])
    expect(discoveryInventoryKeys.tags('provider-1')).toEqual([
      'discovery-inventory', 'tags', 'provider-1',
    ])
    expect(discoveryInventoryKeys.vdisksByVm('VM-01', 'vcenter-01', 'flash-01')).toEqual([
      'discovery-inventory', 'vdisks', 'VM-01', 'vcenter-01', 'flash-01',
    ])
    expect(discoveryInventoryKeys.volumeTree()).toEqual([
      'discovery-inventory', 'volume-tree', null, null,
    ])
    expect(discoveryInventoryKeys.volumeTree('flash-01', 'flat')).toEqual([
      'discovery-inventory', 'volume-tree', 'flash-01', 'flat',
    ])
  })

  it('builds a canonical VMware search key from normalized server filters', () => {
    expect(discoveryInventoryKeys.vmwareSearch()).toEqual([
      'discovery-inventory', 'vmware-search', null, null, null, null,
    ])
    expect(discoveryInventoryKeys.vmwareSearch({
      providerId: ' provider-1 ',
      folderName: ' folder-1 ',
      tag: ' prod ',
      namePrefix: ' app ',
      forceRefresh: true,
    })).toEqual([
      'discovery-inventory', 'vmware-search', 'provider-1', 'folder-1', 'prod', 'app',
    ])
  })

  it('ignores forceRefresh when building the VMware search key', () => {
    expect(discoveryInventoryKeys.vmwareSearch({ providerId: 'provider-1', forceRefresh: false }))
      .toEqual(discoveryInventoryKeys.vmwareSearch({ providerId: 'provider-1', forceRefresh: true }))
  })
})
