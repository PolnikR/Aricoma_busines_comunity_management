export const STANDARD_STALE_TIME_MS = 15 * 60 * 1000
export const STANDARD_GC_TIME_MS = 60 * 60 * 1000
export const ACTIVE_RUN_INTERVAL_MS = 15 * 1000
export const RECOVERY_RUNS_INTERVAL_MS = 5 * 60 * 1000

export const STANDARD_QUERY_OPTIONS = {
  staleTime: STANDARD_STALE_TIME_MS,
  gcTime: STANDARD_GC_TIME_MS,
  retry: 1,
  refetchOnWindowFocus: true,
  refetchOnMount: true,
  refetchOnReconnect: true,
} as const
