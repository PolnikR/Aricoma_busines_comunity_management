import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTIVE_RUN_INTERVAL_MS, STANDARD_STALE_TIME_MS } from '@/shared/query/cachePolicy'
import { fetchOrchestratorRuns } from '../api/recoveryRunsApi'
import { useLatestOrchestratorRun } from './useLatestOrchestratorRun'

vi.mock('../api/recoveryRunsApi', () => ({
  fetchOrchestratorRuns: vi.fn(),
}))

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useLatestOrchestratorRun', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('polls a non-terminal run and stops the fast interval after completion', async () => {
    vi.useFakeTimers()
    vi.mocked(fetchOrchestratorRuns)
      .mockResolvedValueOnce({
        runs: [{ runId: 'r1', status: 'running', startedAt: null, endedAt: null, durationSeconds: null }],
        total: 1,
      })
      .mockResolvedValueOnce({
        runs: [{ runId: 'r1', status: 'success', startedAt: null, endedAt: null, durationSeconds: 1 }],
        total: 1,
      })

    renderHook(() => useLatestOrchestratorRun('airflow-01', 'dag-01'), { wrapper: createWrapper() })

    await vi.advanceTimersByTimeAsync(0)
    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(ACTIVE_RUN_INTERVAL_MS)
    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(ACTIVE_RUN_INTERVAL_MS)
    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(STANDARD_STALE_TIME_MS)
    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(2)
  })
})
