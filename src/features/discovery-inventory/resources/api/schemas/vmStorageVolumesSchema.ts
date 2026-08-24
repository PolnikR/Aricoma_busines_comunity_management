import { z } from 'zod'

export const storageVolumeMappingSchema = z.object({
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

const storageVolumeSnapshotsSchema = z.object({
  has_snapshots: z.boolean().catch(false),
  snapshot_count: z.number().catch(0),
  is_snapshot: z.boolean().catch(false),
  source_mappings: z.array(storageVolumeMappingSchema).catch([]),
  target_mappings: z.array(storageVolumeMappingSchema).catch([]),
})

export const storageVolumeSchema = z.object({
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
  // The backend field is misspelled; normalize it in the mapper.
  sanpshosts: storageVolumeSnapshotsSchema.optional(),
})

export const vdisksResponseSchema = z.object({
  name: z.string().catch(''),
  count_vm: z.number().catch(0),
  count_ibm: z.number().catch(0),
  vdisks: z.record(z.string(), storageVolumeSchema).catch({}),
})

export type StorageVolumeMappingPayload = z.infer<typeof storageVolumeMappingSchema>
export type StorageVolumePayload = z.infer<typeof storageVolumeSchema>
export type VdisksPayload = z.infer<typeof vdisksResponseSchema>
