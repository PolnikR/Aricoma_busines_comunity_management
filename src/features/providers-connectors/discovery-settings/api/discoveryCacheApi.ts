import {
  getCacheConfigDiscoveryCacheConfigGet,
  getCacheHistoryDiscoveryCacheHistoryGet,
  updateCacheConfigDiscoveryCacheConfigPut,
} from '@/generated/api/client.gen'
import type { CacheConfigUpdate } from '@/generated/api/models/cacheConfigUpdate.gen'
import {
  CacheConfigResponse,
  CacheHistoryResponse,
  GetCacheHistoryDiscoveryCacheHistoryGetQueryParams,
  UpdateCacheConfigDiscoveryCacheConfigPutBody,
  type CacheConfigResponseOutput,
  type CacheHistoryResponseOutput,
} from '@/generated/api/zod.gen'
import { parseGeneratedResponse } from '@/shared/api/generatedResponse'
import { toOrvalRequestError } from '@/shared/api/orvalMutator'
import type { DiscoveryCacheConfig, DiscoveryCacheConfigPatch, DiscoveryCacheHistory, DiscoveryCacheHistoryFilters } from '../model/discoveryCacheTypes'

export function toDiscoveryCacheConfigUpdate(patch: DiscoveryCacheConfigPatch): CacheConfigUpdate {
  return UpdateCacheConfigDiscoveryCacheConfigPutBody.parse({
    ...(patch.defaults !== undefined ? { defaults: patch.defaults } : {}),
    ...(patch.historyRetention !== undefined ? {
      history_retention: {
        ...(patch.historyRetention.retentionDays !== undefined ? { retention_days: patch.historyRetention.retentionDays } : {}),
        ...(patch.historyRetention.maxRecords !== undefined ? { max_records: patch.historyRetention.maxRecords } : {}),
      },
    } : {}),
  })
}

export function toDiscoveryCacheHistoryParams(filters: DiscoveryCacheHistoryFilters = {}) {
  return GetCacheHistoryDiscoveryCacheHistoryGetQueryParams.parse({
    ...(filters.providerId !== undefined ? { provider_id: filters.providerId } : {}),
    ...(filters.limit !== undefined ? { limit: filters.limit } : {}),
  })
}

export function mapDiscoveryCacheConfig(config: CacheConfigResponseOutput): DiscoveryCacheConfig {
  return {
    defaults: config.defaults,
    historyRetention: {
      retentionDays: config.history_retention.retention_days,
      maxRecords: config.history_retention.max_records,
    },
  }
}

export function mapDiscoveryCacheHistory(history: CacheHistoryResponseOutput): DiscoveryCacheHistory {
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

export async function fetchDiscoveryCacheConfig(): Promise<DiscoveryCacheConfig> {
  try {
    return mapDiscoveryCacheConfig(parseGeneratedResponse(CacheConfigResponse, await getCacheConfigDiscoveryCacheConfigGet(), 'GET /discovery/cache/config'))
  } catch (error) {
    throw toOrvalRequestError(error, 'Get discovery cache config')
  }
}

export async function updateDiscoveryCacheConfig(patch: DiscoveryCacheConfigPatch): Promise<DiscoveryCacheConfig> {
  const payload = toDiscoveryCacheConfigUpdate(patch)
  try {
    return mapDiscoveryCacheConfig(parseGeneratedResponse(CacheConfigResponse, await updateCacheConfigDiscoveryCacheConfigPut(payload), 'PUT /discovery/cache/config'))
  } catch (error) {
    throw toOrvalRequestError(error, 'Update discovery cache config')
  }
}

export async function fetchDiscoveryCacheHistory(filters: DiscoveryCacheHistoryFilters = {}): Promise<DiscoveryCacheHistory> {
  const params = toDiscoveryCacheHistoryParams(filters)
  try {
    return mapDiscoveryCacheHistory(parseGeneratedResponse(CacheHistoryResponse, await getCacheHistoryDiscoveryCacheHistoryGet(params), 'GET /discovery/cache/history'))
  } catch (error) {
    throw toOrvalRequestError(error, 'Get discovery cache history')
  }
}
