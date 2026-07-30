import type {
  StorageVolume,
  StorageVolumeMapping,
  VmStorageVolumes,
} from '../model/vdisksTypes'
import type {
  StorageVolumeMappingPayload,
  StorageVolumePayload,
  VdisksPayload,
} from '../api/schemas/vdisksSchema'

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

function mapVolume(naaId: string, raw: StorageVolumePayload): StorageVolume {
  const snapshots = raw.sanpshosts
  return {
    naaId,
    id: raw.id,
    name: raw.name,
    volumeName: raw.volume_name,
    capacity: raw.capacity,
    status: raw.status,
    pool: raw.mdisk_grp_name,
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
    volumes: Object.entries(payload.vdisks).map(([naaId, raw]) => mapVolume(naaId, raw)),
  }
}
