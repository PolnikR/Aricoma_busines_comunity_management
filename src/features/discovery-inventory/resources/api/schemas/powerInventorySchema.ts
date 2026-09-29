import { z } from 'zod'
import { PowerVmRecord, PowerVmsResponse } from '@/generated/api/zod.gen'

const powerScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])

export const powerPartitionSchema = z.object({
  PartitionUUID: z.string().optional(),
  PartitionName: z.string().optional(),
  PartitionType: z.string().optional(),
  PartitionState: z.string().optional(),
  SystemName: z.string().optional(),
}).catchall(powerScalarSchema)

// SPEC GAP: the generated PowerVmRecord types `lpar` and `vios` only as
// `record<string, unknown>`, and `counts_by_type` as an open record. Count and
// provider fields come from the generated schema. The spec also lacks the
// top-level `provider_id` the backend returns.
export const powerInventoryResponseSchema = PowerVmsResponse.extend({
  provider_id: z.string().optional(),
  counts_by_type: z.object({
    LogicalPartition: z.number().int().nonnegative(),
    VirtualIOServer: z.number().int().nonnegative(),
  }),
  vms: z.array(PowerVmRecord.extend({
    lpar: powerPartitionSchema,
    vios: powerPartitionSchema,
  })),
})

export type PowerInventoryPayload = z.infer<typeof powerInventoryResponseSchema>
