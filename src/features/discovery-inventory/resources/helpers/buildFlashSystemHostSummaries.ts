import type { FlashSystemVolumeResource } from '../model/discoveryTypes'

export interface FlashSystemMappedVolumeSummary {
  resourceId: string
  name: string
  scsiId: string
  capacityBytes: number | null
}

export interface FlashSystemHostSummary {
  key: string
  providerId: string
  hostId: string
  name: string
  clusterId: string | null
  clusterName: string
  mappedVolumes: FlashSystemMappedVolumeSummary[]
  totalCapacityBytes: number | null
}

export function getFlashSystemHostKey(providerId: string, hostId: string): string {
  return `${encodeURIComponent(providerId)}:${encodeURIComponent(hostId)}`
}

export function buildFlashSystemHostSummaries(
  resources: FlashSystemVolumeResource[],
): Map<string, FlashSystemHostSummary> {
  const summaries = new Map<string, FlashSystemHostSummary>()
  const mappedResourceIds = new Map<string, Set<string>>()

  resources.forEach((resource) => {
    resource.resolvedHostMaps.forEach((host) => {
      const key = getFlashSystemHostKey(resource.providerId, host.host_id)
      const resourceIds = mappedResourceIds.get(key) ?? new Set<string>()
      const summary = summaries.get(key) ?? {
        key,
        providerId: resource.providerId,
        hostId: host.host_id,
        name: host.hostName,
        clusterId: host.clusterId,
        clusterName: host.clusterName,
        mappedVolumes: [],
        totalCapacityBytes: null,
      }
      if (!summary.clusterId && host.clusterId) summary.clusterId = host.clusterId
      if (!summary.clusterName && host.clusterName) summary.clusterName = host.clusterName
      if (!resourceIds.has(resource.resourceId)) {
        resourceIds.add(resource.resourceId)
        summary.mappedVolumes.push({
          resourceId: resource.resourceId,
          name: resource.name,
          scsiId: host.scsi_id,
          capacityBytes: resource.capacityBytes,
        })
      }
      mappedResourceIds.set(key, resourceIds)
      summaries.set(key, summary)
    })
  })

  summaries.forEach((summary) => {
    const capacities = summary.mappedVolumes
      .map(({ capacityBytes }) => capacityBytes)
      .filter((capacity): capacity is number => capacity !== null)
    summary.totalCapacityBytes = capacities.length > 0
      ? capacities.reduce((total, capacity) => total + capacity, 0)
      : null
  })

  return summaries
}
