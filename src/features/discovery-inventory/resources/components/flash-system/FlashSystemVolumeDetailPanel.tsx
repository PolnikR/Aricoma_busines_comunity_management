import { Fragment } from 'react'
import { DetailDrawer, DetailDrawerSection, DetailRow } from '@/shared/components/data-table'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { CopyIcon, GridIcon, LayersIcon, SettingsIcon } from '@/shared/icons/Icons'
import type { FlashSystemVolumeResource } from '../../model/discoveryTypes'

interface FlashSystemVolumeDetailPanelProps {
  volume: FlashSystemVolumeResource | null
  open: boolean
  onClose: () => void
  labels: {
    entity: string
    detail: string
    close: string
    resize: string
    pool: string
    capacity: string
    usedCapacity: string
    freeCapacity: string
    consistencyGroups: string
    groups: Record<'identity' | 'placement' | 'state' | 'copies', string>
    fieldLabels: Record<string, string>
  }
}

const fieldGroups = [
  {
    key: 'identity' as const,
    accent: 'overview' as const,
    icon: GridIcon,
    fields: ['id', 'volume_id', 'vdisk_UID'] as const,
  },
  {
    key: 'placement' as const,
    accent: 'storage' as const,
    icon: LayersIcon,
    fields: ['mdisk_grp_id', 'parent_mdisk_grp_id', 'parent_mdisk_grp_name', 'IO_group_id', 'IO_group_name'] as const,
  },
  {
    key: 'state' as const,
    accent: 'configuration' as const,
    icon: SettingsIcon,
    fields: ['function', 'protocol', 'fast_write_state', 'formatting', 'encrypt'] as const,
  },
  {
    key: 'copies' as const,
    accent: 'protection' as const,
    icon: CopyIcon,
    fields: ['FC_id', 'FC_name', 'consistency_groups', 'RC_id', 'RC_name', 'se_copy_count', 'compressed_copy_count', 'RC_change'] as const,
  },
]

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function ConsistencyGroups({ groups }: { groups: FlashSystemVolumeResource['resolvedConsistencyGroups'] }) {
  if (groups.length === 0) return '-'
  return (
    <ul className="flex flex-wrap gap-1">
      {groups.map((group) => (
        <li key={group.id} title={group.id} className="inline-flex items-center gap-1 rounded-lg border border-border-strong bg-surface px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
          <span>{group.name}</span>
          {group.status ? <span className="font-normal text-text-muted">{group.status}</span> : null}
        </li>
      ))}
    </ul>
  )
}

export function FlashSystemVolumeDetailPanel({ volume, open, onClose, labels }: FlashSystemVolumeDetailPanelProps) {
  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={volume?.name ?? '-'}
      bodyLayout="sections"
      meta={[labels.entity]}
      headerActions={<KeyedHelpPopover helpKey="resources.flash.help" sections={['pool', 'flashCopy', 'remoteCopy', 'consistencyGroups']} />}
      ariaLabel={labels.detail}
      closeLabel={labels.close}
      resizeLabel={labels.resize}
      resizable
    >
      {volume ? (
        // Keyed by volume so each newly opened volume starts with the default sections.
        <Fragment key={volume.id}>
          {fieldGroups.map((group, index) => (
            // Identity and placement start open; state and copies are one click away.
            <DetailDrawerSection key={group.key} title={labels.groups[group.key]} accent={group.accent} icon={group.icon} defaultOpen={index < 2}>
              <dl>{group.fields.map((field) => field === 'consistency_groups'
                ? <DetailRow key={field} label={labels.consistencyGroups} value={<ConsistencyGroups groups={volume.resolvedConsistencyGroups} />} />
                : <DetailRow key={field} label={labels.fieldLabels[field] ?? field} value={display(volume[field])} />)}</dl>
            </DetailDrawerSection>
          ))}
          <DetailDrawerSection title={labels.pool} accent="storage" icon={LayersIcon}>
            <dl>
              <DetailRow label={labels.capacity} value={display(volume.pool?.capacity)} />
              <DetailRow label={labels.usedCapacity} value={display(volume.pool?.used_capacity)} />
              <DetailRow label={labels.freeCapacity} value={display(volume.pool?.free_capacity)} />
            </dl>
          </DetailDrawerSection>
        </Fragment>
      ) : null}
    </DetailDrawer>
  )
}
