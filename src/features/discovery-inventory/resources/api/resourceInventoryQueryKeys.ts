import { normalizeVmwareInventorySearch, type VmwareInventorySearch } from './vmwareInventoryApi'

export const discoveryInventoryKeys = {
  all: ['discovery-inventory'] as const,
  resourceInventory: (providerType: string, providerId?: string) => (
    ['resource-inventory', providerType, providerId ?? null] as const
  ),
  vmwareSearch: (search: VmwareInventorySearch = {}) => {
    const normalized = normalizeVmwareInventorySearch(search)
    return [
      ...discoveryInventoryKeys.all,
      'vmware-search',
      normalized.providerId ?? null,
      normalized.folderName ?? null,
      normalized.tag ?? null,
      normalized.namePrefix ?? null,
    ] as const
  },
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
}
