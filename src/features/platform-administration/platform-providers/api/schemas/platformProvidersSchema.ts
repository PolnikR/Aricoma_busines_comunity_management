import { z } from 'zod'
import {
  OrchestrationProvider,
  OrchestrationProviderRecord,
} from '@/generated/api/zod.gen'

export const platformProviderSubmitSchema = OrchestrationProvider.extend({
  notificationEmail: z.string().trim().pipe(z.email()).nullable().optional(),
})

export const platformProviderRecordSchema = OrchestrationProviderRecord
