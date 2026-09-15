import {
  AccessLogEntry,
  AccessLogsResponse,
  RawAccessLogEntry,
} from '@/generated/api/zod.gen'
import { z } from 'zod'

export const accessLogEntrySchema = AccessLogEntry
export const rawAccessLogEntrySchema = RawAccessLogEntry
export const accessLogsResponseSchema = AccessLogsResponse
export type AccessLogsResponseOutput = z.output<typeof accessLogsResponseSchema>
