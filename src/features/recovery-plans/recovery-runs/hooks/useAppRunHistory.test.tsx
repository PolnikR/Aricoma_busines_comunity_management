import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestedRuns, runsBody, stubOrchestratorRuns } from '../test/stubOrchestratorRuns'
import { useAppRunHistory } from './useAppRunHistory'
import { ACTIVE_RUN_INTERVAL_MS, RECOVERY_RUNS_INTERVAL_MS } from '@/shared/query/cachePolicy'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useAppRunHistory', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('stays disabled and makes no call until given a dagId', () => {
    const mock = stubOrchestratorRuns({ body: runsBody([]) })
    renderHook(() => useAppRunHistory({ providerId: 'airflow-01', dagId: null, page: 1, pageSize: 10 }), { wrapper: createWrapper() })

    expect(mock).not.toHaveBeenCalled()
  })

  it('converts page/pageSize into offset/limit for the full paginated history (not limit=1)', async () => {
    const mock = stubOrchestratorRuns({ body: runsBody([], 22) })

    const { result } = renderHook(
      () => useAppRunHistory({ providerId: 'airflow-01', dagId: 'dag_x', page: 3, pageSize: 5 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => { expect(result.current.data.total).toBe(22) })

    expect(requestedRuns(mock)).toEqual([{
      path: '/api/get_orchestrator_runs',
      params: { provider_id: 'airflow-01', dag_id: 'dag_x', limit: '5', offset: '10', order_by: '-logical_date' },
    }])
  })

  it('maps the Airflow runs kept outside the spec', async () => {
    stubOrchestratorRuns({ body: runsBody([{ id: 'r1', state: 'success' }], 3) })

    const { result } = renderHook(
      () => useAppRunHistory({ providerId: 'airflow-01', dagId: 'dag_x', page: 1, pageSize: 10 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => { expect(result.current.data.total).toBe(3) })
    expect(result.current.data.runs).toEqual([
      { runId: 'r1', status: 'success', startedAt: null, endedAt: null, durationSeconds: null },
    ])
  })

  it('polls history page 1 every 15 seconds until the newest run becomes terminal', async () => {
    vi.useFakeTimers()
    const mock = stubOrchestratorRuns(
      { body: runsBody([{ id: 'r1', state: 'running' }]) },
      { body: runsBody([{ id: 'r1', state: 'success' }]) },
    )

    renderHook(
      () => useAppRunHistory({ providerId: 'airflow-01', dagId: 'dag_x', page: 1, pageSize: 10 }),
      { wrapper: createWrapper() },
    )

    await vi.advanceTimersByTimeAsync(0)
    expect(mock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(ACTIVE_RUN_INTERVAL_MS)
    expect(mock).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(ACTIVE_RUN_INTERVAL_MS)
    expect(mock).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(RECOVERY_RUNS_INTERVAL_MS)
    expect(mock).toHaveBeenCalledTimes(2)
  })

  it('does not poll terminal page 1 or historical pages', async () => {
    vi.useFakeTimers()
    const mock = stubOrchestratorRuns({ body: runsBody([{ id: 'r1', state: 'success' }], 3) })

    const { rerender } = renderHook(
      ({ page }) => useAppRunHistory({ providerId: 'airflow-01', dagId: 'dag_x', page, pageSize: 10 }),
      { initialProps: { page: 1 }, wrapper: createWrapper() },
    )

    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(ACTIVE_RUN_INTERVAL_MS)
    expect(mock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(RECOVERY_RUNS_INTERVAL_MS - ACTIVE_RUN_INTERVAL_MS)
    expect(mock).toHaveBeenCalledTimes(1)

    rerender({ page: 2 })
    await vi.advanceTimersByTimeAsync(0)
    expect(mock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(RECOVERY_RUNS_INTERVAL_MS)
    expect(mock).toHaveBeenCalledTimes(2)
  })

  it('stops polling when the selected entity is cleared', async () => {
    vi.useFakeTimers()
    const mock = stubOrchestratorRuns({ body: runsBody([{ id: 'r1', state: 'running' }]) })

    const historyProps: { dagId: string | null } = { dagId: 'dag_x' }
    const { rerender } = renderHook(
      ({ dagId }) => useAppRunHistory({ providerId: 'airflow-01', dagId, page: 1, pageSize: 10 }),
      { initialProps: historyProps, wrapper: createWrapper() },
    )

    await vi.advanceTimersByTimeAsync(0)
    expect(mock).toHaveBeenCalledTimes(1)

    rerender({ dagId: null })
    await vi.advanceTimersByTimeAsync(ACTIVE_RUN_INTERVAL_MS * 2)
    expect(mock).toHaveBeenCalledTimes(1)
  })
})
