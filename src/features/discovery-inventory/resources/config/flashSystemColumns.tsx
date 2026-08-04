import { StateCell } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import type { FlashSystemVolumeResource } from '../../model/discoveryTypes'
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
  copies: string
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
      cell: (volume) => <StateCell tone={volume.status.toLowerCase() === 'online' ? 'on' : 'warn'} label={volume.status || '-'} />,
    },
    { id: 'capacity', header: labels.capacity, cell: (volume) => volume.capacity || '-', align: 'right' },
    { id: 'pool', header: labels.pool, cell: (volume) => volume.pool?.name ?? volume.mdisk_grp_name },
    { id: 'type', header: labels.type, cell: (volume) => volume.type || '-' },
    {
      id: 'hosts',
      header: labels.hosts,
      cell: (volume) => (
        <FlashSystemHostsCell
          volume={volume}
          summaries={hostSummaries}
          labels={hostLabels}
        />
      ),
    },
    { id: 'copies', header: labels.copies, cell: (volume) => volume.copy_count || '0', align: 'right' },
    { id: 'flashCopy', header: labels.flashCopy, cell: (volume) => volume.fc_map_count || '0', align: 'right' },
    { id: 'provider', header: labels.provider, cell: (volume) => volume.providerId || '-' },
  ]
}
