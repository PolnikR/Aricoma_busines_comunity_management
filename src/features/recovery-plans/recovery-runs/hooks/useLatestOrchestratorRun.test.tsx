import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ACTIVE_RUN_INTERVAL_MS, STANDARD_STALE_TIME_MS } from '@/shared/query/cachePolicy'
import { requestedRuns, runsBody, stubOrchestratorRuns } from '../test/stubOrchestratorRuns'
import { useLatestOrchestratorRun } from './useLatestOrchestratorRun'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useLatestOrchestratorRun', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('polls a non-terminal run and stops the fast interval after completion', async () => {
    vi.useFakeTimers()
    const mock = stubOrchestratorRuns(
      { body: runsBody([{ id: 'r1', state: 'running' }]) },
      { body: runsBody([{ id: 'r1', state: 'success' }]) },
    )

    renderHook(() => useLatestOrchestratorRun('airflow-01', 'dag-01'), { wrapper: createWrapper() })

    await vi.advanceTimersByTimeAsync(0)
    expect(mock).toHaveBeenCalledTimes(1)
    expect(requestedRuns(mock)[0]).toEqual({
      path: '/api/get_orchestrator_runs',
      params: { provider_id: 'airflow-01', dag_id: 'dag-01', limit: '1', order_by: '-logical_date' },
    })

    await vi.advanceTimersByTimeAsync(ACTIVE_RUN_INTERVAL_MS)
    expect(mock).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(ACTIVE_RUN_INTERVAL_MS)
    expect(mock).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(STANDARD_STALE_TIME_MS)
    expect(mock).toHaveBeenCalledTimes(2)
  })
})
