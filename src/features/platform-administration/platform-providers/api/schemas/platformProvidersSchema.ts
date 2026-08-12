import { z } from 'zod'
import {
  PLATFORM_PROVIDER_CREDENTIAL_STATUSES,
  PLATFORM_PROVIDER_TYPES,
} from '../../model/platformProviderTypes'

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
})

const platformProviderRecordSchema = platformProviderSubmitSchema.extend({
  credentialStatus: z.enum(PLATFORM_PROVIDER_CREDENTIAL_STATUSES),
  url: z.url().optional(),
})

export const platformProvidersResponseSchema = z.object({
  providers: z.array(platformProviderRecordSchema),
})

export const platformProviderWriteResponseSchema = z.object({
  providers: z.array(platformProviderSubmitSchema.extend({
    credentialStatus: z.enum(PLATFORM_PROVIDER_CREDENTIAL_STATUSES).optional(),
    url: z.url().optional(),
  })),
})
