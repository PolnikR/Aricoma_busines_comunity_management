import type { DiscoveryInventory } from '../model/discoveryTypes'

export function matchesVmwareProviderTags(vmTags: readonly string[], providerTags: readonly string[]): boolean {
  return providerTags.length === 0 || providerTags.some(tag => vmTags.includes(tag))
}

export function applyVmwareProviderTagScope(inventory: DiscoveryInventory, providerTags: readonly string[]): DiscoveryInventory {
  if (providerTags.length === 0) return inventory
  const virtualMachines = inventory.virtualMachines.filter(vm => matchesVmwareProviderTags(vm.tags, providerTags))
  return { ...inventory, virtualMachines, reportedCount: virtualMachines.length }
}
