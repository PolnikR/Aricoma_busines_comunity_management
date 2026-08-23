import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchOrchestratorRuns } from '../api/recoveryRunsApi'
import { useAppRunHistory } from './useAppRunHistory'
import { ACTIVE_RUN_INTERVAL_MS, RECOVERY_RUNS_INTERVAL_MS } from '@/shared/query/cachePolicy'

vi.mock('../api/recoveryRunsApi', () => ({
  fetchOrchestratorRuns: vi.fn(),
}))

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useAppRunHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stays disabled and makes no call until given a dagId', () => {
    renderHook(() => useAppRunHistory({ providerId: 'airflow-01', dagId: null, page: 1, pageSize: 10 }), { wrapper: createWrapper() })

    expect(fetchOrchestratorRuns).not.toHaveBeenCalled()
  })

  it('converts page/pageSize into offset/limit for the full paginated history (not limit=1)', async () => {
    vi.mocked(fetchOrchestratorRuns).mockResolvedValue({ runs: [], total: 22 })

    const { result } = renderHook(
      () => useAppRunHistory({ providerId: 'airflow-01', dagId: 'dag_x', page: 3, pageSize: 5 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => { expect(result.current.data.total).toBe(22) })

    expect(fetchOrchestratorRuns).toHaveBeenCalledWith('airflow-01', 'dag_x', {
      limit: 5,
      offset: 10,
      orderBy: '-logical_date',
    })
  })

  it('polls history page 1 every 15 seconds until the newest run becomes terminal', async () => {
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

    renderHook(
      () => useAppRunHistory({ providerId: 'airflow-01', dagId: 'dag_x', page: 1, pageSize: 10 }),
      { wrapper: createWrapper() },
    )

    await vi.advanceTimersByTimeAsync(0)
    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(ACTIVE_RUN_INTERVAL_MS)
    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(ACTIVE_RUN_INTERVAL_MS)
    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(RECOVERY_RUNS_INTERVAL_MS)
    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(2)
  })

  it('does not poll terminal page 1 or historical pages', async () => {
    vi.useFakeTimers()
    vi.mocked(fetchOrchestratorRuns).mockResolvedValue({
      runs: [{ runId: 'r1', status: 'success', startedAt: null, endedAt: null, durationSeconds: 1 }],
      total: 3,
    })

    const { rerender } = renderHook(
      ({ page }) => useAppRunHistory({ providerId: 'airflow-01', dagId: 'dag_x', page, pageSize: 10 }),
      { initialProps: { page: 1 }, wrapper: createWrapper() },
    )

    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(ACTIVE_RUN_INTERVAL_MS)
    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(RECOVERY_RUNS_INTERVAL_MS - ACTIVE_RUN_INTERVAL_MS)
    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(1)

    rerender({ page: 2 })
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(RECOVERY_RUNS_INTERVAL_MS)
    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(2)
  })

  it('stops polling when the selected entity is cleared', async () => {
    vi.useFakeTimers()
    vi.mocked(fetchOrchestratorRuns).mockResolvedValue({
      runs: [{ runId: 'r1', status: 'running', startedAt: null, endedAt: null, durationSeconds: null }],
      total: 1,
    })

    const historyProps: { dagId: string | null } = { dagId: 'dag_x' }
    const { rerender } = renderHook(
      ({ dagId }) => useAppRunHistory({ providerId: 'airflow-01', dagId, page: 1, pageSize: 10 }),
      { initialProps: historyProps, wrapper: createWrapper() },
    )

    await vi.advanceTimersByTimeAsync(0)
    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(1)

    rerender({ dagId: null })
    await vi.advanceTimersByTimeAsync(ACTIVE_RUN_INTERVAL_MS * 2)
    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(1)
  })
})
