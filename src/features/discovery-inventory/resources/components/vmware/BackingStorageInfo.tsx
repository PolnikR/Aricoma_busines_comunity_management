import { useId } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { formatStartTime } from '@/shared/utils/dateFormat'
import {
  DataTable,
  DataTableRequestState,
  DetailRow,
  SkeletonBlock,
  type ColumnDef,
} from '@/shared/components/data-table'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { StorageVolume, StorageVolumeMapping } from '../../model/vmStorageVolumesTypes'

const headerCell = 'whitespace-nowrap px-2 @min-[80rem]/vm-detail:px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-subtle'
const cell = 'px-2 @min-[80rem]/vm-detail:px-3 py-2.5 text-[12px] @min-[80rem]/vm-detail:text-[13px] text-text-secondary align-top'
const prefix = 'pages.virtualMachines.detail.backingStorage'

const display = (value: string) => value || '-'

type Translate = ReturnType<typeof useTranslation>['t']

function mappingColumns(t: Translate): ColumnDef<StorageVolumeMapping>[] {
  return [
    {
      id: 'source',
      header: t('details.snapshotSource'),
      cell: mapping => (
        <span className="block max-w-45 truncate" title={mapping.sourceVdiskName}>
          {mapping.sourceVdiskName}
        </span>
      ),
    },
    {
      id: 'target',
      header: t('details.snapshotTarget'),
      cell: mapping => (
        <span className="block max-w-45 truncate" title={mapping.targetVdiskName}>
          {mapping.targetVdiskName}
        </span>
      ),
    },
    { id: 'status', header: t('details.snapshotStatus'), cell: mapping => mapping.status },
    {
      id: 'progress',
      header: t('details.snapshotProgress'),
      cell: mapping => `${mapping.cleanProgress}%`,
      align: 'right',
    },
    {
      id: 'created',
      header: t('details.snapshotCreated'),
      cell: mapping => formatStartTime(mapping.startTime),
    },
  ]
}

function MappingTable({ title, ariaLabel, mappings }: { title: string; ariaLabel: string; mappings: StorageVolumeMapping[] }) {
  const { t } = useTranslation()
  return (
    <div className="border-t border-border">
      <p className="px-5 pt-3 pb-1 text-xs font-semibold uppercase text-text-muted">{title}</p>
      <DataTable<StorageVolumeMapping>
        columns={mappingColumns(t)}
        rows={mappings}
        rowKey={(mapping, index) => `${mapping.id}-${String(index)}`}
        minWidthClassName="min-w-180"
        ariaLabel={ariaLabel}
        headerCellClassName={headerCell}
        cellClassName={cell}
      />
    </div>
  )
}

function BackingStorageVolume({ volume, providers }: { volume: StorageVolume; providers: ProviderRecord[] }) {
  const { t } = useTranslation()
  // Providers are already loaded by the Resources page; an unknown ID shows raw.
  const provider = providers.find(candidate => candidate.id === volume.storageProviderId)
  const titleId = useId()
  const name = volume.volumeName || volume.name || volume.id
  const { snapshotCount, sourceMappings, targetMappings } = volume.snapshots

  return (
    <section aria-labelledby={titleId} className="border-b border-border last:border-b-0">
      <div className="bg-surface-subtle px-5 py-3">
        <h4 id={titleId} className="text-sm font-semibold text-text-primary wrap-anywhere">{name}</h4>
        <p className="text-xs text-text-muted">{t(`${prefix}.volumeEntity`)}</p>
      </div>
      <dl className="px-5 py-2">
        <DetailRow
          label={t(`${prefix}.provider`)}
          value={provider ? provider.name : display(volume.storageProviderId)}
          secondary={provider ? <span className="font-mono">{provider.id}</span> : undefined}
        />
        <DetailRow label={t(`${prefix}.naa`)} value={<span className="font-mono">{display(volume.naaId)}</span>} />
        <DetailRow label={t(`${prefix}.capacity`)} value={display(volume.capacity)} />
        <DetailRow label={t(`${prefix}.status`)} value={display(volume.status)} />
        <DetailRow label={t(`${prefix}.pool`)} value={display(volume.pool)} />
        <DetailRow label={t(`${prefix}.ioGroup`)} value={display(volume.ioGroupName)} />
        <DetailRow label={t(`${prefix}.protocol`)} value={display(volume.protocol)} />
        <DetailRow label={t(`${prefix}.type`)} value={display(volume.type)} />
      </dl>
      <div className="border-t border-border">
        <p className="px-5 pt-3 text-xs font-semibold uppercase text-text-muted">{t(`${prefix}.flashCopy`)}</p>
        <dl className="px-5 py-2">
          <DetailRow label={t(`${prefix}.snapshotCount`)} value={snapshotCount} />
          <DetailRow label={t(`${prefix}.sourceMappings`)} value={sourceMappings.length} />
          <DetailRow label={t(`${prefix}.targetMappings`)} value={targetMappings.length} />
        </dl>
        {sourceMappings.length === 0 && targetMappings.length === 0 ? (
          <p className="px-5 pb-3 text-[12px] @min-[80rem]/vm-detail:text-[13px] text-text-subtle">{t(`${prefix}.noMappings`)}</p>
        ) : null}
        {sourceMappings.length > 0 ? (
          <MappingTable
            title={t(`${prefix}.sourceMappings`)}
            ariaLabel={t(`${prefix}.sourceMappingsTable`, { volume: name })}
            mappings={sourceMappings}
          />
        ) : null}
        {targetMappings.length > 0 ? (
          <MappingTable
            title={t(`${prefix}.targetMappings`)}
            ariaLabel={t(`${prefix}.targetMappingsTable`, { volume: name })}
            mappings={targetMappings}
          />
        ) : null}
      </div>
    </section>
  )
}

function BackingStorageSkeleton() {
  const { t } = useTranslation()
  return (
    <div role="status" aria-busy="true" aria-label={t(`${prefix}.loading`)}>
      <div className="bg-surface-subtle px-5 py-3">
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="mt-1.5 h-3 w-28" />
      </div>
      <div className="flex flex-col gap-3 px-5 py-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="grid grid-cols-[minmax(7rem,35%)_minmax(0,1fr)] gap-x-4">
            <SkeletonBlock className="h-3.5 w-20" />
            <SkeletonBlock className="h-3.5 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}

interface BackingStorageInfoProps {
  volumes: StorageVolume[]
  isLoading: boolean
  isError: boolean
  isFetching: boolean
  onRetry: () => void
  providers: ProviderRecord[]
}

// The storage volumes backing a VM's VMware disks, each with its FlashCopy mappings.
// A volume is shown even when it has no snapshots.
export function BackingStorageInfo({ volumes, isLoading, isError, isFetching, onRetry, providers }: BackingStorageInfoProps) {
  const { t } = useTranslation()

  let content
  if (isLoading) content = <BackingStorageSkeleton />
  else if (volumes.length === 0) content = <p className="p-4 text-[12px] @min-[80rem]/vm-detail:text-[13px] text-text-subtle">{t(`${prefix}.empty`)}</p>
  else content = volumes.map(volume => <BackingStorageVolume key={volume.naaId} volume={volume} providers={providers} />)

  return (
    <DataTableRequestState
      error={isError ? {
        title: t('resources.common.loadFailed'),
        retryLabel: t('buttons.retry'),
        isRetrying: isFetching,
        onRetry,
      } : null}
    >
      <div className="flex flex-col">{content}</div>
    </DataTableRequestState>
  )
}
