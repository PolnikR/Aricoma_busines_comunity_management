import { z } from 'zod'
import {
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
