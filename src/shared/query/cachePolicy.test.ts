import { describe, expect, it } from 'vitest'
import {
  ACTIVE_RUN_INTERVAL_MS,
  RECOVERY_RUNS_INTERVAL_MS,
  STANDARD_GC_TIME_MS,
  STANDARD_QUERY_OPTIONS,
  STANDARD_REFETCH_INTERVAL_MS,
  STANDARD_STALE_TIME_MS,
} from './cachePolicy'

describe('standard query cache policy', () => {
  it('uses one production policy for normal queries', () => {
    expect(STANDARD_STALE_TIME_MS).toBe(15 * 60 * 1000)
    expect(STANDARD_GC_TIME_MS).toBe(60 * 60 * 1000)
    expect(STANDARD_REFETCH_INTERVAL_MS).toBe(15 * 60 * 1000)
    expect(ACTIVE_RUN_INTERVAL_MS).toBe(15 * 1000)
    expect(RECOVERY_RUNS_INTERVAL_MS).toBe(5 * 60 * 1000)
    expect(STANDARD_QUERY_OPTIONS).toEqual({
      staleTime: STANDARD_STALE_TIME_MS,
      gcTime: STANDARD_GC_TIME_MS,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchInterval: STANDARD_REFETCH_INTERVAL_MS,
      refetchIntervalInBackground: false,
    })
  })
})
