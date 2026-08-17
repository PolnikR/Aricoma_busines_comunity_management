import type { FlashSystemVolumeResource } from '../../../model/discoveryTypes'
import {
  getFlashSystemHostKey,
} from '../../helpers/buildFlashSystemHostSummaries'
import type { FlashSystemHostSummary } from '../../helpers/buildFlashSystemHostSummaries'
import {
  FlashSystemAdditionalHostsBadge,
  FlashSystemHostBadge,
} from './FlashSystemHostBadge'
import type { FlashSystemHostTooltipLabels } from './FlashSystemHostBadge'

interface FlashSystemHostsCellProps {
  volume: FlashSystemVolumeResource
  summaries: Map<string, FlashSystemHostSummary>
  labels: FlashSystemHostTooltipLabels
}

export function FlashSystemHostsCell({
  volume,
  summaries,
  labels,
}: FlashSystemHostsCellProps) {
  const hosts = Array.from(new Map(
    volume.resolvedHostMaps
      .map((host) => summaries.get(getFlashSystemHostKey(volume.providerId, host.host_id)))
      .filter((summary): summary is FlashSystemHostSummary => summary !== undefined)
      .map((summary) => [summary.key, summary]),
  ).values())
  const visibleHosts = hosts.slice(0, 2)
  const additionalHosts = hosts.slice(2)

  if (hosts.length === 0) return '-'

  return (
    <div className="flex max-w-80 items-center gap-1 whitespace-nowrap">
      {visibleHosts.map((summary) => (
        <FlashSystemHostBadge key={summary.key} summary={summary} labels={labels} />
      ))}
      {additionalHosts.length > 0 && (
        <FlashSystemAdditionalHostsBadge summaries={additionalHosts} labels={labels} />
      )}
    </div>
  )
}
