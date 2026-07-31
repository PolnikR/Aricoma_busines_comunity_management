import type {
  FlashSystemVolumeResource,
  PowerPartitionResource,
} from '../../model/discoveryTypes'
import type {
  FlashSystemFilterOptions,
  FlashSystemFilters,
  PowerFilterOptions,
  PowerFilters,
} from '../model/sourceInventoryTypes'

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right))
}

export function getFlashSystemFilterOptions(
  resources: FlashSystemVolumeResource[],
): FlashSystemFilterOptions {
  const pools = new Map<string, string>()
  const hosts = new Map<string, string>()
  resources.forEach((resource) => {
    if (resource.mdisk_grp_id) {
      pools.set(resource.mdisk_grp_id, resource.pool?.name ?? resource.mdisk_grp_name)
    }
    resource.resolvedHostMaps.forEach((host) => hosts.set(host.host_id, host.hostName))
  })
  return {
    pools: [...pools].map(([id, name]) => ({ id, name })),
    hosts: [...hosts].map(([id, name]) => ({ id, name })),
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
      && (!filters.providerId || resource.providerId === filters.providerId)
      && (!filters.poolId || resource.mdisk_grp_id === filters.poolId)
      && (!filters.hostId || resource.host_maps.some((host) => host.host_id === filters.hostId))
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
      && (!filters.providerId || resource.providerId === filters.providerId)
      && (!filters.partitionKind || resource.partitionKind === filters.partitionKind)
      && (!filters.partitionState || resource.partitionState === filters.partitionState)
      && (!filters.operatingSystemType || resource.operatingSystemType === filters.operatingSystemType)
      && (!filters.volumeState || resource.volumeState === filters.volumeState)
  })
}
