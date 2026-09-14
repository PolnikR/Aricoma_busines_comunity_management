export interface AccessLogFilters {
  lines?: number
  status?: number
  method?: string
  pathContains?: string
}

export interface AccessLogRequestRecord {
  kind: 'request'
  user?: string
  timestamp?: string
  method: string
  path: string
  status: number
  durationMs: number
  requestBody: unknown
  responseBody: unknown
}

export interface AccessLogRawRecord {
  kind: 'raw'
  raw: string
}

export type AccessLogRecord = AccessLogRequestRecord | AccessLogRawRecord
