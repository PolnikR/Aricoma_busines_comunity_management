import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestedRuns, runsBody, stubOrchestratorRuns } from '../test/stubOrchestratorRuns'
import { useOrchestratedEntityRuns } from './useOrchestratedEntityRuns'
import type { OrchestratedEntity } from '../model/recoveryRunTypes'
import { RECOVERY_RUNS_INTERVAL_MS } from '@/shared/query/cachePolicy'

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
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('queries each entity using its own providerId, one call each with limit 1', async () => {
    const mock = stubOrchestratorRuns({ body: runsBody([{ id: 'r1', state: 'success' }], 5) })

    const { result } = renderHook(() => useOrchestratedEntityRuns(entities), { wrapper: createWrapper() })

    await waitFor(() => { expect(result.current.rows.every(row => row.latestRunState.status !== 'loading')).toBe(true) })

    expect(requestedRuns(mock).map(request => request.params)).toEqual(expect.arrayContaining([
      { provider_id: 'airflow-01', dag_id: 'dag_260818094526_2918dccb', limit: '1', order_by: '-logical_date' },
      { provider_id: 'airflow-02', dag_id: 'dag_260817113000_aa11bb', limit: '1', order_by: '-logical_date' },
    ]))
    expect(mock).toHaveBeenCalledTimes(2)
    expect(result.current.rows[0]?.latestRunState).toMatchObject({ status: 'data', run: { status: 'success' } })
    expect(result.current.isFetching).toBe(false)
  })

  it('represents a failed lookup separately from an empty successful lookup', async () => {
    stubOrchestratorRuns({ status: 503, body: { detail: 'Airflow unavailable' } }, { body: runsBody([]) })

    const { result } = renderHook(() => useOrchestratedEntityRuns(entities), { wrapper: createWrapper() })

    await waitFor(() => { expect(result.current.rows.every(row => row.latestRunState.status !== 'loading')).toBe(true) })
    expect(result.current.rows[0]?.latestRunState).toMatchObject({
      status: 'error',
      error: { name: 'OrvalApiError', status: 503 },
    })
    expect(result.current.rows[1]?.latestRunState).toEqual({ status: 'empty', refreshError: null })
  })

  it('makes zero calls when the entity list is empty', () => {
    const mock = stubOrchestratorRuns({ body: runsBody([]) })
    renderHook(() => useOrchestratedEntityRuns([]), { wrapper: createWrapper() })

    expect(mock).not.toHaveBeenCalled()
  })

  it('does not interval-poll overview snapshots, including active runs', async () => {
    vi.useFakeTimers()
    const mock = stubOrchestratorRuns({ body: runsBody([{ id: 'r1', state: 'running' }]) })

    renderHook(() => useOrchestratedEntityRuns(entities.slice(0, 1)), { wrapper: createWrapper() })

    await vi.advanceTimersByTimeAsync(0)
    expect(mock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(15 * 1000)
    expect(mock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(RECOVERY_RUNS_INTERVAL_MS - 15 * 1000)
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('exposes aggregate fetching state and refetches each visible latest run', async () => {
    const mock = stubOrchestratorRuns({ body: runsBody([]) })

    const { result } = renderHook(() => useOrchestratedEntityRuns(entities), { wrapper: createWrapper() })

    await waitFor(() => { expect(result.current.isFetching).toBe(false) })
    expect(result.current.rows).toHaveLength(2)

    await act(async () => { await result.current.refetch() })

    expect(mock).toHaveBeenCalledTimes(4)
  })
})
