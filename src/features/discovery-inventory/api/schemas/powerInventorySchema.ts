import { z } from 'zod'

const powerPartitionSchema = z.object({
  PartitionUUID: z.string().optional(),
  PartitionName: z.string().optional(),
  PartitionType: z.string().optional(),
  PartitionState: z.string().optional(),
  SystemName: z.string().optional(),
}).loose()

export const powerInventoryResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  counts_by_type: z.object({
    LogicalPartition: z.number().int().nonnegative(),
    VirtualIOServer: z.number().int().nonnegative(),
  }),
  vms: z.array(z.object({
    lpar: powerPartitionSchema,
    vios: powerPartitionSchema,
  })),
})

export type PowerInventoryPayload = z.infer<typeof powerInventoryResponseSchema>
