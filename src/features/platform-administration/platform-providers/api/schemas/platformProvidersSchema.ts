import { z } from 'zod'
import { PLATFORM_PROVIDER_TYPES } from '../../model/platformProviderTypes'

export const platformProviderSubmitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  type: z.enum(PLATFORM_PROVIDER_TYPES),
  ipAddress: z.string().min(1),
  port: z.number()
    .int()
    .min(1)
    .max(65_535),
  dagDir: z.string().min(1),
  credentialId: z.string().min(1),
  url: z.url().optional(),
  vmPrefix: z.string().nullable().optional(),
  vmTags: z.array(z.string()).optional(),
  notificationEmail: z.string().trim().pipe(z.email()).nullable().optional(),
})

export const platformProviderRecordSchema = platformProviderSubmitSchema.extend({
  dagDir: z.string().nullable().optional(),
})
