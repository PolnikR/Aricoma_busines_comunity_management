import { StateCell } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import type { FlashSystemVolumeResource } from '../model/discoveryTypes'
import { FlashSystemHostsCell } from '../components/flash-system/FlashSystemHostsCell'
import type { FlashSystemHostTooltipLabels } from '../components/flash-system/FlashSystemHostBadge'
import type { FlashSystemHostSummary } from '../helpers/buildFlashSystemHostSummaries'

interface FlashSystemColumnLabels {
  name: string
  status: string
  capacity: string
  pool: string
  type: string
  hosts: string
  flashCopy: string
  provider: string
}

export function createFlashSystemColumns(
  labels: FlashSystemColumnLabels,
  hostSummaries: Map<string, FlashSystemHostSummary>,
  hostLabels: FlashSystemHostTooltipLabels,
): ColumnDef<FlashSystemVolumeResource>[] {
  return [
    {
      id: 'name',
      header: labels.name,
      cellClassName: 'w-[25%]',
      cell: (volume) => (
        <>
          <span className="block max-w-60 truncate font-semibold text-text-primary" title={volume.name}>{volume.name}</span>
          <span className="block max-w-60 truncate font-mono text-[11px] text-text-subtle" title={volume.vdisk_UID}>{volume.vdisk_UID || '-'}</span>
        </>
      ),
    },
    {
      id: 'status',
      header: labels.status,
      cellClassName: 'w-[8%]',
      cell: (volume) => <StateCell tone={volume.status.toLowerCase() === 'online' ? 'on' : 'warn'} label={volume.status || '-'} />,
    },
    { id: 'capacity', header: labels.capacity, cell: (volume) => volume.capacity || '-', align: 'right', cellClassName: 'w-[8%]' },
    { id: 'pool', header: labels.pool, cell: (volume) => volume.pool?.name ?? volume.mdisk_grp_name, cellClassName: 'w-[7%]' },
    { id: 'type', header: labels.type, cell: (volume) => volume.type || '-', cellClassName: 'w-[7%]' },
    {
      id: 'hosts',
      header: labels.hosts,
      cellClassName: 'w-[19%]',
      cell: (volume) => (
        <FlashSystemHostsCell
          volume={volume}
          summaries={hostSummaries}
          labels={hostLabels}
        />
      ),
    },
    { id: 'flashCopy', header: labels.flashCopy, cell: (volume) => volume.fc_map_count || '0', align: 'right', cellClassName: 'w-[11%]' },
    { id: 'provider', header: labels.provider, cell: (volume) => volume.providerId || '-', cellClassName: 'w-[15%] whitespace-nowrap' },
  ]
}
