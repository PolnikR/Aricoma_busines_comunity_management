import { z } from 'zod'
import { VolumesResponse } from '@/generated/api/zod.gen'

const flashSystemPoolSchema = z.object({
  name: z.string().catch('-'),
  capacity: z.string().catch('-'),
  used_capacity: z.string().catch('-'),
  free_capacity: z.string().catch('-'),
}).loose()

const flashSystemHostSchema = z.object({
  name: z.string().catch('-'),
  cluster_id: z.string().nullable().catch(null),
  cluster_name: z.string().catch(''),
}).loose()

const flashSystemRelatedResourceSchema = z.object({
  name: z.string().catch('-'),
}).loose()

const flashSystemVolumeSchema = z.object({
  provider_id: z.string().nullable().optional(),
  id: z.string().catch(''),
  name: z.string().min(1),
  IO_group_id: z.string().catch(''),
  IO_group_name: z.string().catch('-'),
  status: z.string().catch('unknown'),
  mdisk_grp_id: z.string().catch(''),
  mdisk_grp_name: z.string().catch('-'),
  capacity: z.string().catch('-'),
  type: z.string().catch('-'),
  FC_id: z.string().catch(''),
  FC_name: z.string().catch(''),
  RC_id: z.string().catch(''),
  RC_name: z.string().catch(''),
  vdisk_UID: z.string().catch(''),
  fc_map_count: z.string().catch('0'),
  copy_count: z.string().catch('0'),
  fast_write_state: z.string().catch('-'),
  se_copy_count: z.string().catch('0'),
  RC_change: z.string().catch(''),
  compressed_copy_count: z.string().catch('0'),
  parent_mdisk_grp_id: z.string().catch(''),
  parent_mdisk_grp_name: z.string().catch(''),
  formatting: z.string().catch('-'),
  encrypt: z.string().catch('-'),
  volume_id: z.string().catch(''),
  volume_name: z.string().catch(''),
  function: z.string().catch('-'),
  protocol: z.string().catch('-'),
  host_maps: z.array(z.object({
    host_id: z.string(),
    scsi_id: z.string(),
  }).loose()).catch([]),
}).loose()

// SPEC GAP: the generated VolumesResponse types volumes, pools, hosts and
// clusters only as `record<string, unknown>`. Count and provider id come from the
// generated schema; the untyped collections are typed locally.
export const flashSystemInventoryResponseSchema = VolumesResponse.extend({
  volumes: z.array(flashSystemVolumeSchema),
  pools: z.record(z.string(), flashSystemPoolSchema).catch({}),
  hosts: z.record(z.string(), flashSystemHostSchema).catch({}),
  clusters: z.record(z.string(), flashSystemRelatedResourceSchema).catch({}),
})

export type FlashSystemInventoryPayload = z.infer<typeof flashSystemInventoryResponseSchema>
