export const discoveryInventoryKeys = {
  all: ['discovery-inventory'] as const,
  inventory: (providerId?: string, tag?: string) => (
    [...discoveryInventoryKeys.all, 'inventory', providerId ?? null, tag ?? null] as const
  ),
  tags: () => [...discoveryInventoryKeys.all, 'tags'] as const,
  vdisksByVm: (vmName: string, providerId?: string) => (
    [...discoveryInventoryKeys.all, 'vdisks', vmName, providerId ?? null] as const
  ),
}
