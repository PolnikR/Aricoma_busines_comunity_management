import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchOrchestratorRuns } from '../api/recoveryRunsApi'
import { useOrchestratedEntityRuns } from './useOrchestratedEntityRuns'
import type { OrchestratedEntity } from '../model/recoveryRunTypes'
import { RECOVERY_RUNS_INTERVAL_MS } from '@/shared/query/cachePolicy'

vi.mock('../api/recoveryRunsApi', () => ({
  fetchOrchestratorRuns: vi.fn(),
}))

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const entities: OrchestratedEntity[] = [
  { entityType: 'application', id: 'finance_recovery', name: 'Finance Recovery', dagId: 'dag_260818094526_2918dccb', providerId: 'airflow-01' },
  { entityType: 'group', id: 'billing_group', name: 'Billing Group', dagId: 'dag_260817113000_aa11bb', providerId: 'airflow-02' },
]

describe('useOrchestratedEntityRuns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('queries each entity using its own providerId, one call each with limit 1', async () => {
    vi.mocked(fetchOrchestratorRuns).mockResolvedValue({
      runs: [{ runId: 'r1', status: 'success', startedAt: '2026-08-18T00:00:00Z', endedAt: '2026-08-18T00:01:00Z', durationSeconds: 60 }],
      total: 5,
    })

    const { result } = renderHook(() => useOrchestratedEntityRuns(entities), { wrapper: createWrapper() })

    await waitFor(() => { expect(result.current.rows.every(row => !row.isLoading)).toBe(true) })

    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(2)
    expect(fetchOrchestratorRuns).toHaveBeenCalledWith('airflow-01', 'dag_260818094526_2918dccb', { limit: 1, orderBy: '-logical_date' })
    expect(fetchOrchestratorRuns).toHaveBeenCalledWith('airflow-02', 'dag_260817113000_aa11bb', { limit: 1, orderBy: '-logical_date' })
    expect(result.current.rows[0]?.latestRun?.status).toBe('success')
    expect(result.current.isFetching).toBe(false)
  })

  it('makes zero calls when the entity list is empty', () => {
    renderHook(() => useOrchestratedEntityRuns([]), { wrapper: createWrapper() })

    expect(fetchOrchestratorRuns).not.toHaveBeenCalled()
  })

  it('polls an active run only at the five-minute Recovery Runs interval', async () => {
    vi.useFakeTimers()
    vi.mocked(fetchOrchestratorRuns)
      .mockResolvedValueOnce({
        runs: [{ runId: 'r1', status: 'running', startedAt: null, endedAt: null, durationSeconds: null }],
        total: 1,
      })
      .mockResolvedValueOnce({
        runs: [{ runId: 'r1', status: 'running', startedAt: null, endedAt: null, durationSeconds: null }],
        total: 1,
      })

    renderHook(() => useOrchestratedEntityRuns(entities.slice(0, 1)), { wrapper: createWrapper() })

    await vi.advanceTimersByTimeAsync(0)
    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(15 * 1000)
    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(RECOVERY_RUNS_INTERVAL_MS - 15 * 1000)
    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(2)
  })

  it('exposes aggregate fetching state and refetches each visible latest run', async () => {
    vi.mocked(fetchOrchestratorRuns).mockResolvedValue({ runs: [], total: 0 })

    const { result } = renderHook(() => useOrchestratedEntityRuns(entities), { wrapper: createWrapper() })

    await waitFor(() => { expect(result.current.isFetching).toBe(false) })
    expect(result.current.rows).toHaveLength(2)

    await act(async () => { await result.current.refetch() })

    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(4)
  })
})
