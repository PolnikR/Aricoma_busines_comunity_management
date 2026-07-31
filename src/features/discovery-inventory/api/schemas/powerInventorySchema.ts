import { z } from 'zod'

const powerScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])

export const powerPartitionSchema = z.object({
  PartitionUUID: z.string().optional(),
  PartitionName: z.string().optional(),
  PartitionType: z.string().optional(),
  PartitionState: z.string().optional(),
  SystemName: z.string().optional(),
}).catchall(powerScalarSchema)

export const powerInventoryResponseSchema = z.object({
  provider_id: z.string().optional(),
  count: z.number().int().nonnegative(),
  counts_by_type: z.object({
    LogicalPartition: z.number().int().nonnegative(),
    VirtualIOServer: z.number().int().nonnegative(),
  }),
  vms: z.array(z.object({
    provider_id: z.string().optional(),
    lpar: powerPartitionSchema,
    vios: powerPartitionSchema,
  }).loose()),
}).loose()

export type PowerInventoryPayload = z.infer<typeof powerInventoryResponseSchema>
