import { z } from 'zod'
import {
  PROVIDER_CREDENTIAL_STATUSES,
  PROVIDER_TYPES,
} from '../../model/providerTypes'

export const providerSubmitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  type: z.enum(PROVIDER_TYPES),
  ipAddress: z.string().min(1),
  port: z.number().int().min(1).max(65_535),
  credentialId: z.string().nullable(),
})

const providerRecordSchema = providerSubmitSchema.extend({
  defaultFlashcopyProviderId: z.string().min(1).nullable().optional(),
  credentialStatus: z.enum(PROVIDER_CREDENTIAL_STATUSES),
})

export const providersResponseSchema = z.object({
  providers: z.array(providerRecordSchema),
})
