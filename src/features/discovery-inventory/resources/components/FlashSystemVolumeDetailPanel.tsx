import { DetailDrawer, DetailRow } from '@/shared/components/data-table'
import type { FlashSystemVolumeResource } from '../../model/discoveryTypes'

interface FlashSystemVolumeDetailPanelProps {
  volume: FlashSystemVolumeResource | null
  open: boolean
  onClose: () => void
  labels: {
    selected: string
    detail: string
    close: string
    pool: string
    name: string
    capacity: string
    usedCapacity: string
    freeCapacity: string
    hostMappings: string
    host: string
    cluster: string
    noMappings: string
    provider: string
  }
}

const fieldGroups = [
  {
    label: 'Identity',
    fields: ['id', 'volume_id', 'volume_name', 'vdisk_UID'] as const,
  },
  {
    label: 'Placement and capacity',
    fields: ['capacity', 'mdisk_grp_id', 'mdisk_grp_name', 'parent_mdisk_grp_id', 'parent_mdisk_grp_name', 'IO_group_id', 'IO_group_name'] as const,
  },
  {
    label: 'State and behavior',
    fields: ['status', 'type', 'function', 'protocol', 'fast_write_state', 'formatting', 'encrypt'] as const,
  },
  {
    label: 'Copy relationships',
    fields: ['FC_id', 'FC_name', 'RC_id', 'RC_name', 'fc_map_count', 'copy_count', 'se_copy_count', 'compressed_copy_count', 'RC_change'] as const,
  },
]

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

export function FlashSystemVolumeDetailPanel({ volume, open, onClose, labels }: FlashSystemVolumeDetailPanelProps) {
  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      eyebrow={labels.selected}
      title={volume?.name ?? '-'}
      subtitle={volume ? `${volume.providerId} · ${volume.status}` : ''}
      ariaLabel={labels.detail}
      closeLabel={labels.close}
      resizable
    >
      {volume ? (
        <div className="space-y-5 p-5">
          {fieldGroups.map((group) => (
            <section key={group.label}>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#71819a]">{group.label}</h3>
              <dl>{group.fields.map((field) => <DetailRow key={field} label={field} value={display(volume[field])} />)}</dl>
            </section>
          ))}
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#71819a]">{labels.pool}</h3>
            <dl>
              <DetailRow label={labels.name} value={display(volume.pool?.name)} />
              <DetailRow label={labels.capacity} value={display(volume.pool?.capacity)} />
              <DetailRow label={labels.usedCapacity} value={display(volume.pool?.used_capacity)} />
              <DetailRow label={labels.freeCapacity} value={display(volume.pool?.free_capacity)} />
            </dl>
          </section>
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#71819a]">{labels.hostMappings}</h3>
            {volume.resolvedHostMaps.length > 0 ? (
              <div className="space-y-2">
                {volume.resolvedHostMaps.map((host) => (
                  <dl key={`${host.host_id}:${host.scsi_id}`} className="rounded-xl border border-[#dfe9f3] px-3">
                    <DetailRow label={labels.host} value={host.hostName} secondary={host.host_id} />
                    <DetailRow label="SCSI ID" value={host.scsi_id} />
                    <DetailRow label={labels.cluster} value={host.clusterName || '-'} secondary={host.clusterId} />
                  </dl>
                ))}
              </div>
            ) : <p className="text-sm text-[#71819a]">{labels.noMappings}</p>}
          </section>
          <DetailRow label={labels.provider} value={volume.providerId || '-'} />
        </div>
      ) : null}
    </DetailDrawer>
  )
}
