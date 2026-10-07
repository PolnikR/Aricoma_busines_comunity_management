import { DetailField, DetailOverview, DetailView, DetailViewSection } from '@/shared/components/detail-view'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { FlashVolumeRelationshipHelp } from './FlashVolumeRelationshipHelp'
import { ApiIcon, CopyIcon, LayersIcon, SettingsIcon, StorageIcon } from '@/shared/icons/Icons'
import type { FlashSystemVolumeResource } from '../../model/discoveryTypes'

interface FlashSystemVolumeDetailPanelProps {
  volume: FlashSystemVolumeResource | null
  // The whole provider list, to name the FlashSystem and its configured partner in the help.
  allProviders?: readonly ProviderRecord[]
  open: boolean
  onClose: () => void
  labels: {
    entity: string
    detail: string
    close: string
    pool: string
    capacity: string
    usedCapacity: string
    freeCapacity: string
    consistencyGroups: string
    groups: Record<'identity' | 'placement' | 'state' | 'copies', string>
    fieldLabels: Record<string, string>
  }
}

// Sections in the order of the original detail drawer, Identity first.
const fieldSections = [
  {
    key: 'identity' as const,
    icon: ApiIcon,
    fields: ['id', 'volume_id', 'vdisk_UID'] as const,
  },
  {
    key: 'placement' as const,
    icon: LayersIcon,
    fields: ['mdisk_grp_id', 'parent_mdisk_grp_id', 'parent_mdisk_grp_name', 'IO_group_id', 'IO_group_name'] as const,
  },
  {
    key: 'state' as const,
    icon: SettingsIcon,
    fields: ['function', 'protocol', 'fast_write_state', 'formatting', 'encrypt'] as const,
  },
  {
    key: 'copies' as const,
    icon: CopyIcon,
    fields: ['FC_id', 'FC_name', 'consistency_groups', 'RC_id', 'RC_name', 'se_copy_count', 'compressed_copy_count', 'RC_change'] as const,
  },
]
// Identifiers render monospace with a copy action.
const identifierFields = new Set<string>(['id', 'volume_id', 'vdisk_UID'])

// Raw backend value as text; an empty value renders the shared "Not set".
function display(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function ConsistencyGroups({ groups }: { groups: FlashSystemVolumeResource['resolvedConsistencyGroups'] }) {
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

export function FlashSystemVolumeDetailPanel({ volume, allProviders = [], open, onClose, labels }: FlashSystemVolumeDetailPanelProps) {
  if (!open || !volume) return null

  return (
    <DetailView
      // Keyed by volume so each newly opened volume starts expanded on its first section.
      key={volume.id}
      open
      onClose={onClose}
      entityLabel={labels.entity}
      title={volume.name || '-'}
      headerActions={(
        <KeyedHelpPopover helpKey="resources.flash.help" sections={['pool', 'flashCopy', 'remoteCopy', 'consistencyGroups']} width="wide">
          <FlashVolumeRelationshipHelp volume={volume} allProviders={allProviders} />
        </KeyedHelpPopover>
      )}
      ariaLabel={labels.detail}
      closeLabel={labels.close}
    >
      {fieldSections.map((section) => (
        <DetailViewSection key={section.key} id={section.key} title={labels.groups[section.key]} icon={section.icon}>
          <DetailOverview>
            {section.fields.map((field) => field === 'consistency_groups'
              ? (
                  <DetailField
                    key={field}
                    label={labels.consistencyGroups}
                    value={volume.resolvedConsistencyGroups.length > 0 ? <ConsistencyGroups groups={volume.resolvedConsistencyGroups} /> : null}
                    wide
                  />
                )
              : (
                  <DetailField
                    key={field}
                    label={labels.fieldLabels[field] ?? field}
                    value={display(volume[field])}
                    mono={identifierFields.has(field)}
                    copyValue={identifierFields.has(field) ? display(volume[field]) : undefined}
                  />
                ))}
          </DetailOverview>
        </DetailViewSection>
      ))}
      <DetailViewSection id="pool" title={labels.pool} icon={StorageIcon}>
        <DetailOverview>
          <DetailField label={labels.capacity} value={display(volume.pool?.capacity)} emphasis />
          <DetailField label={labels.usedCapacity} value={display(volume.pool?.used_capacity)} />
          <DetailField label={labels.freeCapacity} value={display(volume.pool?.free_capacity)} />
        </DetailOverview>
      </DetailViewSection>
    </DetailView>
  )
}
