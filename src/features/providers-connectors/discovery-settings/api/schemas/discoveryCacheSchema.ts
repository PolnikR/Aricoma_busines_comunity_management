import { z } from 'zod'
import type { CacheConfigUpdate } from '@/generated/api/models/cacheConfigUpdate.gen'
import type {
  DiscoveryCacheConfig,
  DiscoveryCacheConfigPatch,
  DiscoveryCacheHistoryFilters,
  DiscoveryCacheHistory,
} from '../../model/discoveryCacheTypes'

const positiveInteger = z.number().int().positive()

const discoveryCacheConfigPatchSchema = z.object({
  defaults: z.record(z.string(), positiveInteger).optional(),
  historyRetention: z.object({
    retentionDays: positiveInteger.optional(),
    maxRecords: positiveInteger.optional(),
  }).optional(),
})

const discoveryCacheHistoryFiltersSchema = z.object({
  providerId: z.string().optional(),
  limit: positiveInteger.optional(),
})

export function toDiscoveryCacheConfigUpdate(patch: DiscoveryCacheConfigPatch): CacheConfigUpdate {
  const validated = discoveryCacheConfigPatchSchema.parse(patch)
  return {
    ...(validated.defaults !== undefined ? { defaults: validated.defaults } : {}),
    ...(validated.historyRetention !== undefined ? {
      history_retention: {
        ...(validated.historyRetention.retentionDays !== undefined ? { retention_days: validated.historyRetention.retentionDays } : {}),
        ...(validated.historyRetention.maxRecords !== undefined ? { max_records: validated.historyRetention.maxRecords } : {}),
      },
    } : {}),
  }
}

export function toDiscoveryCacheHistoryParams(filters: DiscoveryCacheHistoryFilters = {}) {
  const validated = discoveryCacheHistoryFiltersSchema.parse(filters)
  return {
    ...(validated.providerId !== undefined ? { provider_id: validated.providerId } : {}),
    ...(validated.limit !== undefined ? { limit: validated.limit } : {}),
  }
}

export function mapDiscoveryCacheConfig(config: {
  defaults: Record<string, number>
  history_retention: { retention_days: number; max_records: number }
}): DiscoveryCacheConfig {
  return {
    defaults: config.defaults,
    historyRetention: {
      retentionDays: config.history_retention.retention_days,
      maxRecords: config.history_retention.max_records,
    },
  }
}

export function mapDiscoveryCacheHistory(history: {
  runs: {
    provider_id: string; provider_type: string; triggered_by: 'stale' | 'forced' | 'param_change'; started_at: string; duration_ms: number; success: boolean; record_count?: number | null; error?: string | null
  }[]
}): DiscoveryCacheHistory {
  return { runs: history.runs.map(run => ({
    providerId: run.provider_id,
    providerType: run.provider_type,
    triggeredBy: run.triggered_by,
    startedAt: run.started_at,
    durationMs: run.duration_ms,
    success: run.success,
    ...(run.record_count !== undefined ? { recordCount: run.record_count } : {}),
    ...(run.error !== undefined ? { error: run.error } : {}),
  })) }
}
