import {
  AccessLogEntry,
  AccessLogsResponse,
  RawAccessLogEntry,
} from '@/generated/api/zod.gen'

export const accessLogEntrySchema = AccessLogEntry
export const rawAccessLogEntrySchema = RawAccessLogEntry
export const accessLogsResponseSchema = AccessLogsResponse
