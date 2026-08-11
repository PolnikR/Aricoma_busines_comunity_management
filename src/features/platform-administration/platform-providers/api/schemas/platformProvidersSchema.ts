import { z } from 'zod'
import {
  PLATFORM_PROVIDER_CREDENTIAL_STATUSES,
  PLATFORM_PROVIDER_TYPES,
} from '../../model/platformProviderTypes'
import { PLATFORM_PROVIDERS_CONFIG } from '../../config/platformProvidersConfig'

export const platformProviderSubmitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  type: z.enum(PLATFORM_PROVIDER_TYPES),
  ipAddress: z.string().min(1),
  port: z.number()
    .int()
    .min(PLATFORM_PROVIDERS_CONFIG.connection.minPort)
    .max(PLATFORM_PROVIDERS_CONFIG.connection.maxPort),
  dagDir: z.string().min(1),
  credentialId: z.string().min(1),
})

const platformProviderRecordSchema = platformProviderSubmitSchema.extend({
  credentialStatus: z.enum(PLATFORM_PROVIDER_CREDENTIAL_STATUSES),
  url: z.string().optional(),
})

export const platformProvidersResponseSchema = z.object({
  providers: z.array(platformProviderRecordSchema),
})

export const platformProviderWriteResponseSchema = z.object({
  providers: z.array(platformProviderSubmitSchema.extend({
    credentialStatus: z.enum(PLATFORM_PROVIDER_CREDENTIAL_STATUSES).optional(),
    url: z.string().optional(),
  })),
})
