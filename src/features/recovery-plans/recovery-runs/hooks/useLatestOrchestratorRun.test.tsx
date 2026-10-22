import type { PropsWithChildren } from 'react'
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ACTIVE_RUN_INTERVAL_MS, STANDARD_QUERY_OPTIONS, STANDARD_STALE_TIME_MS } from '@/shared/query/cachePolicy'
import { requestedRuns, runsBody, stubOrchestratorRuns } from '../test/stubOrchestratorRuns'
import { useLatestOrchestratorRun } from './useLatestOrchestratorRun'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false } } })
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useLatestOrchestratorRun', () => {
  afterEach(() => {
    vi.useRealTimers()
    focusManager.setFocused(undefined)
    vi.unstubAllGlobals()
  })

  it.each([
    ['running', 15000], ['success', 900000],
  ])('reuses a cached %s run until its existing stale time expires', async (state, staleTime) => {
    vi.useFakeTimers()
    const mock = stubOrchestratorRuns({ body: runsBody([{ id: 'r1', state }]) })
    const initialProps: { dagId: string | null } = { dagId: 'dag-01' }
    const { rerender } = renderHook(({ dagId }) => useLatestOrchestratorRun('airflow-01', dagId), {
      initialProps, wrapper: createWrapper(),
    })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    rerender({ dagId: null })
    await act(async () => { await vi.advanceTimersByTimeAsync(staleTime - 1) })
    rerender({ dagId: 'dag-01' })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(mock).toHaveBeenCalledTimes(1)
    rerender({ dagId: null })
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    rerender({ dagId: 'dag-01' })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(mock).toHaveBeenCalledTimes(2)
  })

  it('does not interval-poll an active run while the window is unfocused', async () => {
    vi.useFakeTimers()
    const mock = stubOrchestratorRuns({ body: runsBody([{ id: 'r1', state: 'running' }]) })
    const view = renderHook(() => useLatestOrchestratorRun('airflow-01', 'dag-01'), { wrapper: createWrapper() })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    act(() => { focusManager.setFocused(false) })
    await act(async () => { await vi.advanceTimersByTimeAsync(45000) })
    expect(mock).toHaveBeenCalledTimes(1)
    view.unmount()
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
