import {
  getCacheConfigDiscoveryCacheConfigGet,
  getCacheHistoryDiscoveryCacheHistoryGet,
  updateCacheConfigDiscoveryCacheConfigPut,
} from '@/generated/api/client.gen'
import { CacheConfigResponse, CacheHistoryResponse } from '@/generated/api/zod.gen'
import { parseGeneratedResponse } from '@/shared/api/generatedResponse'
import { toOrvalRequestError } from '@/shared/api/orvalMutator'
import type { DiscoveryCacheConfig, DiscoveryCacheConfigPatch, DiscoveryCacheHistory, DiscoveryCacheHistoryFilters } from '../model/discoveryCacheTypes'
import { mapDiscoveryCacheConfig, mapDiscoveryCacheHistory, toDiscoveryCacheConfigUpdate, toDiscoveryCacheHistoryParams } from './schemas/discoveryCacheSchema'

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
