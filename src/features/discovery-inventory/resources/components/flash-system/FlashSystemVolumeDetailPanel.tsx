import { DetailDrawer, DetailRow } from '@/shared/components/data-table'
import type { FlashSystemVolumeResource } from '../../../model/discoveryTypes'

interface FlashSystemVolumeDetailPanelProps {
  volume: FlashSystemVolumeResource | null
  open: boolean
  onClose: () => void
  labels: {
    selected: string
    detail: string
    close: string
    pool: string
    capacity: string
    usedCapacity: string
    freeCapacity: string
    groups: Record<'identity' | 'placement' | 'state' | 'copies', string>
    fieldLabels: Record<string, string>
  }
}

const fieldGroups = [
  {
    key: 'identity' as const,
    fields: ['id', 'volume_id', 'vdisk_UID'] as const,
  },
  {
    key: 'placement' as const,
    fields: ['mdisk_grp_id', 'parent_mdisk_grp_id', 'parent_mdisk_grp_name', 'IO_group_id', 'IO_group_name'] as const,
  },
  {
    key: 'state' as const,
    fields: ['function', 'protocol', 'fast_write_state', 'formatting', 'encrypt'] as const,
  },
  {
    key: 'copies' as const,
    fields: ['FC_id', 'FC_name', 'RC_id', 'RC_name', 'se_copy_count', 'compressed_copy_count', 'RC_change'] as const,
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
      ariaLabel={labels.detail}
      closeLabel={labels.close}
      resizable
    >
      {volume ? (
        <div className="space-y-5 p-5">
          {fieldGroups.map((group) => (
            <section key={group.key}>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-primary">{labels.groups[group.key]}</h3>
              <dl>{group.fields.map((field) => <DetailRow key={field} label={labels.fieldLabels[field] ?? field} value={display(volume[field])} />)}</dl>
            </section>
          ))}
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-primary">{labels.pool}</h3>
            <dl>
              <DetailRow label={labels.capacity} value={display(volume.pool?.capacity)} />
              <DetailRow label={labels.usedCapacity} value={display(volume.pool?.used_capacity)} />
              <DetailRow label={labels.freeCapacity} value={display(volume.pool?.free_capacity)} />
            </dl>
          </section>
        </div>
      ) : null}
    </DetailDrawer>
  )
}
