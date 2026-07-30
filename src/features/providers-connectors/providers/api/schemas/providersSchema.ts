import { z } from 'zod'
import {
  PROVIDER_CREDENTIAL_STATUSES,
  PROVIDER_TYPES,
} from '../../model/providerTypes'

const providerRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  type: z.enum(PROVIDER_TYPES),
  ipAddress: z.string().min(1),
  credentialId: z.string().nullable(),
  credentialStatus: z.enum(PROVIDER_CREDENTIAL_STATUSES),
})

export const providersResponseSchema = z.object({
  providers: z.array(providerRecordSchema),
})
