import type { DiscoveryInventory, PowerInventory, FlashSystemInventory } from '../model/discoveryTypes'

export function isPowerInventory(inventory: unknown): inventory is PowerInventory {
  return Boolean(inventory && typeof inventory === 'object' && 'partitions' in inventory)
}

export function isVmwareInventory(inventory: unknown): inventory is DiscoveryInventory {
  return Boolean(inventory && typeof inventory === 'object' && 'virtualMachines' in inventory && !('partitions' in inventory))
}

export function isFlashSystemInventory(inventory: unknown): inventory is FlashSystemInventory {
  return Boolean(inventory && typeof inventory === 'object' && 'resources' in inventory)
}
