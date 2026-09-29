import type { CacheRunRecordOutput } from '@/generated/api/zod.gen'

export interface DiscoveryCacheConfig {
  defaults: Record<string, number>
  historyRetention: {
    retentionDays: number
    maxRecords: number
  }
}

export interface DiscoveryCacheConfigPatch {
  defaults?: Record<string, number>
  historyRetention?: {
    retentionDays?: number
    maxRecords?: number
  }
}

export interface DiscoveryCacheHistoryFilters {
  providerId?: string
  limit?: number
}

export type DiscoveryCacheRunTrigger = CacheRunRecordOutput['triggered_by']

export interface DiscoveryCacheRun {
  providerId: string
  providerType: string
  triggeredBy: DiscoveryCacheRunTrigger
  startedAt: string
  durationMs: number
  success: boolean
  recordCount?: number | null
  error?: string | null
}

export interface DiscoveryCacheHistory {
  runs: DiscoveryCacheRun[]
}
