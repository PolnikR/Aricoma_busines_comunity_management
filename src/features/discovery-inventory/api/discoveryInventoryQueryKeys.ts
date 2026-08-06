export const DISCOVERY_INVENTORY_STALE_TIME_MS = 15 * 60 * 1000
export const DISCOVERY_INVENTORY_GC_TIME_MS = 60 * 60 * 1000

export const discoveryInventoryKeys = {
  all: ['discovery-inventory'] as const,
  resourceInventory: (providerType: string, providerId?: string) => (
    ['resource-inventory', providerType, providerId ?? null] as const
  ),
  inventory: (providerId?: string, tag?: string) => (
    [...discoveryInventoryKeys.all, 'inventory', providerId ?? null, tag ?? null] as const
  ),
  tags: () => [...discoveryInventoryKeys.all, 'tags'] as const,
  vdisksByVm: (vmName: string, providerId?: string, ibmProviderId?: string) => (
    [
      ...discoveryInventoryKeys.all,
      'vdisks',
      vmName,
      providerId ?? null,
      ibmProviderId ?? null,
    ] as const
  ),
  volumeTree: (providerId?: string, view?: string) => (
    [...discoveryInventoryKeys.all, 'volume-tree', providerId ?? null, view ?? null] as const
  ),
}
