import { describe, expect, it } from 'vitest'
import type { DiscoveredVirtualMachine, DiscoveryInventory } from '../model/discoveryTypes'
import { applyFiltersAndPagination } from './filterVirtualMachines'
import { mapInventoryToVirtualMachines } from './mapInventoryToVirtualMachines'
import { applyVmwareProviderTagScope, matchesVmwareProviderTags } from './applyVmwareProviderTagScope'

function vm(id: string, tags: string[], cluster = 'in-scope'): DiscoveredVirtualMachine {
  return {
    id, name: id, tags, cluster, powerState: 'poweredOn', connectionState: 'connected',
    guestOs: '', hostname: '', ipAddress: '', vcpu: 2, memoryGb: 4, host: '',
    primaryDatastore: '', folder: '', vmPath: '', providerId: 'provider', providerType: 'VMWARE',
    disks: [], snapshotCount: 0, toolsStatus: '',
  }
}

describe('applyVmwareProviderTagScope', () => {
  it('includes either configured tag exactly once, with case-sensitive exact membership', () => {
    const inventory: DiscoveryInventory = {
      reportedCount: 6,
      virtualMachines: [vm('first', ['prod']), vm('second', ['dr']), vm('both', ['prod', 'dr']),
        vm('none', []), vm('different-case', ['PROD']), vm('substring', ['prod-copy'])],
    }

    const scoped = applyVmwareProviderTagScope(inventory, ['prod', 'dr'])

    expect(scoped.virtualMachines.map(item => item.id)).toEqual(['first', 'second', 'both'])
    expect(scoped.reportedCount).toBe(3)
    expect(inventory.reportedCount).toBe(6)
    expect(inventory.virtualMachines).toHaveLength(6)
    expect(scoped.virtualMachines[0]).toBe(inventory.virtualMachines[0])
  })

  it('preserves the full inventory when no provider tag scope is configured', () => {
    const inventory = { reportedCount: 1, virtualMachines: [vm('untagged', [])] }
    expect(applyVmwareProviderTagScope(inventory, [])).toBe(inventory)
    expect(matchesVmwareProviderTags([], [])).toBe(true)
  })

  it('derives metrics and options from all scoped rows before editable filters and pagination', () => {
    const inventory = {
      reportedCount: 13,
      virtualMachines: [...Array.from({ length: 11 }, (_, index) => vm(String(index), ['dr'])),
        vm('both', ['prod', 'dr'], 'other-scoped'), vm('excluded', [], 'excluded')],
    }
    const mapped = mapInventoryToVirtualMachines(applyVmwareProviderTagScope(inventory, ['prod', 'dr']))
    const page = applyFiltersAndPagination(mapped, {
      page: 1, pageSize: 10, search: '', powerState: '', connectionState: '',
      cluster: 'in-scope', tags: [], untagged: false,
    })

    expect(page.items).toHaveLength(10)
    expect(page.total).toBe(11)
    expect(page.metrics).toEqual({ total: 12, poweredOn: 12, clusters: 2, totalCpu: 24, totalMemoryGb: 48 })
    expect(page.filterOptions.clusters).toEqual(['in-scope', 'other-scoped'])
  })
})
