import { z } from 'zod'
import {
  AccessLogEntry,
  RawAccessLogEntry,
} from '@/generated/api/zod.gen'

// The backend includes these fields before publishing them in OpenAPI.
export const accessLogEntrySchema = AccessLogEntry.extend({
  user: z.string().nullish(),
  timestamp: z.string().nullish(),
})
export const rawAccessLogEntrySchema = RawAccessLogEntry
export const accessLogsResponseSchema = z.object({
  entries: z.array(z.union([accessLogEntrySchema, rawAccessLogEntrySchema])),
})
export type AccessLogsResponseOutput = z.output<typeof accessLogsResponseSchema>
