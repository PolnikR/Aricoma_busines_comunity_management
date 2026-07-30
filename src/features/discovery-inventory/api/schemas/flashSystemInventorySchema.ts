import { z } from 'zod'

const flashSystemRelatedResourceSchema = z.object({
  name: z.string().catch('-'),
}).loose()

const flashSystemVolumeSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  status: z.string().catch('unknown'),
  capacity: z.string().catch('-'),
  type: z.string().catch('-'),
  vdisk_UID: z.string().catch(''),
  mdisk_grp_id: z.string().catch(''),
  mdisk_grp_name: z.string().catch('-'),
  host_maps: z.array(z.object({
    host_id: z.string(),
    scsi_id: z.string(),
  })).catch([]),
}).loose()

export const flashSystemInventoryResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  volumes: z.array(flashSystemVolumeSchema),
  pools: z.record(z.string(), flashSystemRelatedResourceSchema).catch({}),
  hosts: z.record(z.string(), flashSystemRelatedResourceSchema).catch({}),
  clusters: z.record(z.string(), flashSystemRelatedResourceSchema).catch({}),
})

export type FlashSystemInventoryPayload = z.infer<typeof flashSystemInventoryResponseSchema>
