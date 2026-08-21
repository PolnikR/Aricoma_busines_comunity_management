export const discoveryInventoryKeys = {
  all: ['discovery-inventory'] as const,
  resourceInventory: (providerType: string, providerId?: string) => (
    ['resource-inventory', providerType, providerId ?? null] as const
  ),
  inventory: (providerId?: string, tag?: string) => (
    [...discoveryInventoryKeys.all, 'inventory', providerId ?? null, tag ?? null] as const
  ),
  tags: (providerId?: string | null) => [...discoveryInventoryKeys.all, 'tags', providerId ?? null] as const,
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
  vmsByName: (prefix?: string, providerId?: string) => (
    [...discoveryInventoryKeys.all, 'vms-by-name', prefix ?? null, providerId ?? null] as const
  ),
  rawVmsByName: (prefix?: string, providerId?: string) => (
    [...discoveryInventoryKeys.all, 'raw-vms-by-name', prefix ?? null, providerId ?? null] as const
  ),
}
