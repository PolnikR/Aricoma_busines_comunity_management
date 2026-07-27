import { z } from 'zod'
import { apiFetch } from '@/shared/api/apiClient'

const VDISKS_BY_VM_URL = '/api/vdisks_by_vm'

export interface StorageVolumeMapping {
  id: string
  name: string
  sourceVdiskId: string
  sourceVdiskName: string
  targetVdiskId: string
  targetVdiskName: string
  status: string
  progress: string
  copyRate: string
  cleanProgress: string
  startTime: string
}

export interface StorageVolumeSnapshots {
  hasSnapshots: boolean
  snapshotCount: number
  isSnapshot: boolean
  sourceMappings: StorageVolumeMapping[]
  targetMappings: StorageVolumeMapping[]
}

export interface StorageVolume {
  naaId: string
  id: string
  name: string
  volumeName: string
  capacity: string
  status: string
  pool: string
  type: string
  protocol: string
  vdiskUid: string
  copyCount: string
  fcMapCount: string
  snapshots: StorageVolumeSnapshots
}

export interface VmStorageVolumes {
  vmName: string
  countVm: number
  countIbm: number
  volumes: StorageVolume[]
}

const mappingSchema = z.object({
  id: z.string().catch(''),
  name: z.string().catch(''),
  source_vdisk_id: z.string().catch(''),
  source_vdisk_name: z.string().catch(''),
  target_vdisk_id: z.string().catch(''),
  target_vdisk_name: z.string().catch(''),
  status: z.string().catch('-'),
  progress: z.string().catch('0'),
  copy_rate: z.string().catch('0'),
  clean_progress: z.string().catch('0'),
  start_time: z.string().catch(''),
})

// Note: the backend field is misspelled "sanpshosts"; we normalise it to
// `snapshots` at this boundary.
const snapshotsSchema = z.object({
  has_snapshots: z.boolean().catch(false),
  snapshot_count: z.number().catch(0),
  is_snapshot: z.boolean().catch(false),
  source_mappings: z.array(mappingSchema).catch([]),
  target_mappings: z.array(mappingSchema).catch([]),
})

const volumeSchema = z.object({
  id: z.string().catch(''),
  name: z.string().catch(''),
  volume_name: z.string().catch(''),
  capacity: z.string().catch('-'),
  status: z.string().catch('-'),
  mdisk_grp_name: z.string().catch('-'),
  type: z.string().catch('-'),
  protocol: z.string().catch('-'),
  vdisk_UID: z.string().catch(''),
  copy_count: z.string().catch('0'),
  fc_map_count: z.string().catch('0'),
  sanpshosts: snapshotsSchema.optional(),
})

const vdisksResponseSchema = z.object({
  name: z.string().catch(''),
  count_vm: z.number().catch(0),
  count_ibm: z.number().catch(0),
  vdisks: z.record(z.string(), volumeSchema).catch({}),
})

function mapMapping(raw: z.infer<typeof mappingSchema>): StorageVolumeMapping {
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

function mapVolume(naaId: string, raw: z.infer<typeof volumeSchema>): StorageVolume {
  const snaps = raw.sanpshosts
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
      hasSnapshots: snaps?.has_snapshots ?? false,
      snapshotCount: snaps?.snapshot_count ?? 0,
      isSnapshot: snaps?.is_snapshot ?? false,
      sourceMappings: snaps?.source_mappings.map(mapMapping) ?? [],
      targetMappings: snaps?.target_mappings.map(mapMapping) ?? [],
    },
  }
}

// GET /api/vdisks_by_vm?vm_name=<name>[&provider_id=<id>]
// Returns the IBM storage volumes backing a VM. vm_name is required; provider_id
// is optional.
export async function fetchVdisksByVm(vmName: string, providerId?: string): Promise<VmStorageVolumes> {
  const params = new URLSearchParams({ vm_name: vmName })
  if (providerId) params.set('provider_id', providerId)

  const response = await apiFetch(`${VDISKS_BY_VM_URL}?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`Vdisks request failed with status ${String(response.status)}`)
  }

  const payload: unknown = await response.json()
  const parsed = vdisksResponseSchema.parse(payload)

  return {
    vmName: parsed.name,
    countVm: parsed.count_vm,
    countIbm: parsed.count_ibm,
    volumes: Object.entries(parsed.vdisks).map(([naaId, raw]) => mapVolume(naaId, raw)),
  }
}
