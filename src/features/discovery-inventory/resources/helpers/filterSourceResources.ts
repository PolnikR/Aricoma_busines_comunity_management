import type {
  FlashSystemVolumeResource,
  PowerPartitionResource,
} from '../model/discoveryTypes'
import type {
  FlashSystemFilterOptions,
  FlashSystemFilters,
  PowerFilterOptions,
  PowerFilters,
} from '../model/sourceInventoryTypes'

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right))
}

function scopedFilterValue(providerId: string, sourceId: string): string {
  return `${encodeURIComponent(providerId)}:${encodeURIComponent(sourceId)}`
}

function matchesScopedFilter(value: string, providerId: string, sourceId: string): boolean {
  return !value || value === scopedFilterValue(providerId, sourceId)
}

export function getFlashSystemFilterOptions(
  resources: FlashSystemVolumeResource[],
): FlashSystemFilterOptions {
  const pools = new Map<string, { name: string; providerId: string; sourceId: string }>()
  const hosts = new Map<string, { name: string; providerId: string; sourceId: string }>()
  resources.forEach((resource) => {
    if (resource.mdisk_grp_id) {
      const id = scopedFilterValue(resource.providerId, resource.mdisk_grp_id)
      pools.set(id, {
        name: resource.pool?.name ?? resource.mdisk_grp_name,
        providerId: resource.providerId,
        sourceId: resource.mdisk_grp_id,
      })
    }
    resource.resolvedHostMaps.forEach((host) => {
      const id = scopedFilterValue(resource.providerId, host.host_id)
      hosts.set(id, {
        name: host.hostName,
        providerId: resource.providerId,
        sourceId: host.host_id,
      })
    })
  })
  return {
    pools: [...pools].map(([id, option]) => ({ id, ...option })),
    hosts: [...hosts].map(([id, option]) => ({ id, ...option })),
    statuses: unique(resources.map((resource) => resource.status)),
  }
}

export function filterFlashSystemResources(
  resources: FlashSystemVolumeResource[],
  filters: FlashSystemFilters,
): FlashSystemVolumeResource[] {
  const search = filters.search.trim().toLocaleLowerCase()
  return resources.filter((resource) => {
    const matchesSearch = !search || [
      resource.name,
      resource.volume_id,
      resource.vdisk_UID,
      resource.mdisk_grp_name,
      resource.pool?.name ?? '',
      ...resource.resolvedHostMaps.map((host) => host.hostName),
    ].some((value) => value.toLocaleLowerCase().includes(search))
    return matchesSearch
      && matchesScopedFilter(filters.poolId, resource.providerId, resource.mdisk_grp_id)
      && (!filters.hostId || resource.host_maps.some(
        (host) => matchesScopedFilter(filters.hostId, resource.providerId, host.host_id),
      ))
      && (!filters.status || resource.status === filters.status)
  })
}

export function getPowerFilterOptions(
  resources: PowerPartitionResource[],
): PowerFilterOptions {
  return {
    partitionKinds: unique(resources.map((resource) => resource.partitionKind)),
    partitionStates: unique(resources.map((resource) => resource.partitionState)),
    operatingSystemTypes: unique(resources.map((resource) => resource.operatingSystemType)),
    volumeStates: unique(resources.map((resource) => resource.volumeState)),
  }
}

export function filterPowerResources(
  resources: PowerPartitionResource[],
  filters: PowerFilters,
): PowerPartitionResource[] {
  const search = filters.search.trim().toLocaleLowerCase()
  return resources.filter((resource) => {
    const data = resource.partitionData
    const matchesSearch = !search || [
      resource.partitionName,
      resource.systemName,
      String(data['LogicalSerialNumber'] ?? ''),
      String(data['IPAddress'] ?? ''),
      resource.deviceName,
      resource.volumeName,
    ].some((value) => value.toLocaleLowerCase().includes(search))
    return matchesSearch
      && (!filters.partitionKind || resource.partitionKind === filters.partitionKind)
      && (!filters.partitionState || resource.partitionState === filters.partitionState)
      && (!filters.operatingSystemType || resource.operatingSystemType === filters.operatingSystemType)
      && (!filters.volumeState || resource.volumeState === filters.volumeState)
  })
}
