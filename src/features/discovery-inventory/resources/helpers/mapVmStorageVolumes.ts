import type {
  StorageVolume,
  StorageVolumeMapping,
  VmStorageVolumes,
} from '../model/vmStorageVolumesTypes'
import type {
  StorageVolumeMappingOutput as StorageVolumeMappingPayload,
  StorageVolumeOutput as StorageVolumePayload,
  VdisksByVmResponseOutput as VdisksPayload,
} from '@/generated/query/zod'

// The backend adds storage_provider_id, IO_group_name and volume_id to each volume; the
// spec does not list them, so they arrive as unlisted keys kept by validatingMutator.
type StorageVolumeWire = StorageVolumePayload & Partial<Record<'storage_provider_id' | 'IO_group_name' | 'volume_id', unknown>>

const toText = (value: unknown) => (typeof value === 'string' ? value : '')

function mapMapping(raw: StorageVolumeMappingPayload): StorageVolumeMapping {
  return {
    id: raw.id,
    name: raw.name,
    sourceVdiskId: raw.source_vdisk_id,
    sourceVdiskName: raw.source_vdisk_name,
    targetVdiskId: raw.target_vdisk_id,
    targetVdiskName: raw.target_vdisk_name,
    status: raw.status,
    progress: raw.progress,
    copyRate: raw.copy_rate,
    cleanProgress: raw.clean_progress,
    startTime: raw.start_time,
  }
}

function mapVolume(key: string, raw: StorageVolumeWire): StorageVolume {
  const snapshots = raw.sanpshosts
  return {
    key,
    // VMware keys volumes by NAA; IBM Power uses an internal storage_provider_id:volume_id key.
    naa: /^naa\./i.test(key) ? key : null,
    volumeId: toText(raw.volume_id) || raw.id,
    id: raw.id,
    name: raw.name,
    volumeName: raw.volume_name,
    capacity: raw.capacity,
    status: raw.status,
    pool: raw.mdisk_grp_name,
    ioGroupName: toText(raw.IO_group_name),
    storageProviderId: toText(raw.storage_provider_id),
    type: raw.type,
    protocol: raw.protocol,
    vdiskUid: raw.vdisk_UID,
    copyCount: raw.copy_count,
    fcMapCount: raw.fc_map_count,
    snapshots: {
      hasSnapshots: snapshots?.has_snapshots ?? false,
      snapshotCount: snapshots?.snapshot_count ?? 0,
      isSnapshot: snapshots?.is_snapshot ?? false,
      sourceMappings: snapshots?.source_mappings.map(mapMapping) ?? [],
      targetMappings: snapshots?.target_mappings.map(mapMapping) ?? [],
    },
  }
}

export function mapVdisks(payload: VdisksPayload): VmStorageVolumes {
  return {
    vmName: payload.name,
    countVm: payload.count_vm,
    countIbm: payload.count_ibm,
    volumes: Object.entries(payload.vdisks).map(([key, raw]) => mapVolume(key, raw)),
  }
}
