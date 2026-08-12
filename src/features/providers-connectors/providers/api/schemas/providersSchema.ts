import { z } from 'zod'
import {
  PROVIDER_CREDENTIAL_STATUSES,
  PROVIDER_ROLES,
  PROVIDER_TYPES,
} from '../../model/providerTypes'

export const providerSubmitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  type: z.enum(PROVIDER_TYPES),
  ipAddress: z.string().min(1),
  url: z.url().nullable().optional(),
  credentialId: z.string().nullable(),
  role: z.enum(PROVIDER_ROLES),
  defaultFlashcopyProviderId: z.string().min(1).nullable().optional(),
  orchestratorConnId: z.string().min(1).nullable().optional(),
})

const providerRecordSchema = providerSubmitSchema.extend({
  port: z.number().int().min(1).max(65_535).optional(),
  credentialStatus: z.enum(PROVIDER_CREDENTIAL_STATUSES),
})

export const providersResponseSchema = z.object({
  providers: z.array(providerRecordSchema),
})
