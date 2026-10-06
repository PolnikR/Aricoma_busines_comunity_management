import { useId } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { formatStartTime } from '@/shared/utils/dateFormat'
import {
  DataTable,
  DataTableRequestState,
  SkeletonBlock,
  type ColumnDef,
} from '@/shared/components/data-table'
import { DetailField, DetailFieldGroup, DetailTechnicalGroup } from '@/shared/components/detail-view'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { StorageVolume, StorageVolumeMapping } from '../model/vmStorageVolumesTypes'

const headerCell = 'whitespace-nowrap px-2 @min-[80rem]/backing-storage:px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-subtle'
const cell = 'px-2 @min-[80rem]/backing-storage:px-3 py-2.5 text-[12px] @min-[80rem]/backing-storage:text-[13px] text-text-secondary align-top'
const prefix = 'resources.backingStorage'

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
    <div>
      <h5 className="mb-2 text-xs font-semibold text-text-muted">{title}</h5>
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

// How a resolved FlashSystem volume is identified for the compute resource that uses it:
// VMware shows the volume's vdisk UID (its NAA belongs to the VMware disk view), IBM Power
// shows Volume ID and Volume UID. Never inferred from the volume, so Power never gets NAA.
export type BackingVolumeIdentity = 'vdiskUid' | 'volumeIdAndUid'

function BackingStorageVolume({ volume, providers, identity }: { volume: StorageVolume; providers: ProviderRecord[]; identity: BackingVolumeIdentity }) {
  const { t } = useTranslation()
  // Providers are already loaded by the Resources page; an unknown ID shows raw.
  const provider = providers.find(candidate => candidate.id === volume.storageProviderId)
  const titleId = useId()
  const name = volume.volumeName || volume.name || volume.id
  const { snapshotCount, sourceMappings, targetMappings } = volume.snapshots

  return (
    // One volume of a DetailView section: its storage fields, its identifiers and FlashCopy.
    <section aria-labelledby={titleId} className="flex flex-col gap-6 [&+&]:border-t [&+&]:border-border/70 [&+&]:pt-7">
      <header>
        <h4 id={titleId} className="text-sm font-semibold text-text-primary wrap-anywhere">{name}</h4>
        <p className="text-xs text-text-muted">{t(`${prefix}.volumeEntity`)}</p>
      </header>
      <DetailFieldGroup>
        <DetailField
          label={t(`${prefix}.provider`)}
          value={provider ? provider.name : volume.storageProviderId}
          secondary={provider ? <span className="font-mono">{provider.id}</span> : undefined}
        />
        <DetailField label={t(`${prefix}.capacity`)} value={volume.capacity} />
        <DetailField label={t(`${prefix}.status`)} value={volume.status} />
        <DetailField label={t(`${prefix}.pool`)} value={volume.pool} />
        <DetailField label={t(`${prefix}.ioGroup`)} value={volume.ioGroupName} />
        <DetailField label={t(`${prefix}.protocol`)} value={volume.protocol} />
        <DetailField label={t(`${prefix}.type`)} value={volume.type} />
      </DetailFieldGroup>
      <DetailTechnicalGroup>
        {identity === 'vdiskUid' ? (
          <DetailField label={t(`${prefix}.vdiskUid`)} value={volume.vdiskUid} copyValue={volume.vdiskUid} />
        ) : (
          <>
            <DetailField label={t(`${prefix}.volumeId`)} value={volume.volumeId} copyValue={volume.volumeId} />
            <DetailField label={t(`${prefix}.volumeUid`)} value={volume.vdiskUid} copyValue={volume.vdiskUid} />
          </>
        )}
      </DetailTechnicalGroup>
      <DetailFieldGroup title={t(`${prefix}.flashCopy`)}>
        <DetailField label={t(`${prefix}.snapshotCount`)} value={String(snapshotCount)} />
        <DetailField label={t(`${prefix}.sourceMappings`)} value={String(sourceMappings.length)} />
        <DetailField label={t(`${prefix}.targetMappings`)} value={String(targetMappings.length)} />
      </DetailFieldGroup>
      {sourceMappings.length === 0 && targetMappings.length === 0 ? (
        <p className="-mt-3 text-[13px] text-text-subtle">{t(`${prefix}.noMappings`)}</p>
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
    </section>
  )
}

function BackingStorageSkeleton() {
  const { t } = useTranslation()
  return (
    <div role="status" aria-busy="true" aria-label={t(`${prefix}.loading`)}>
      <SkeletonBlock className="h-4 w-40" />
      <SkeletonBlock className="mt-1.5 h-3 w-28" />
      {/* Same label-above-value cells as the DetailFieldGroup grid. */}
      <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-5 @min-[520px]/detail-content:grid-cols-2 @min-[860px]/detail-content:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index}>
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="mt-2 h-3.5 w-32" />
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
  identity: BackingVolumeIdentity
  // Shown when the request succeeds without any volume; worded for the compute resource.
  emptyText: string
}

// The storage volumes backing a compute resource (VMware VM or IBM Power LPAR), each
// with its FlashCopy mappings. A volume is shown even when it has no snapshots. Hosted as the
// content of a DetailViewSection, so it uses the shared field and technical primitives.
export function BackingStorageInfo({ volumes, isLoading, isError, isFetching, onRetry, providers, identity, emptyText }: BackingStorageInfoProps) {
  const { t } = useTranslation()

  let content
  if (isLoading) content = <BackingStorageSkeleton />
  else if (volumes.length === 0) content = <p className="text-[13px] text-text-subtle">{emptyText}</p>
  else content = volumes.map(volume => <BackingStorageVolume key={volume.key} volume={volume} providers={providers} identity={identity} />)

  return (
    // Own container, so the layout steps work in any drawer that hosts this section.
    <div className="@container/backing-storage">
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
    </div>
  )
}
