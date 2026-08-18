import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchOrchestratorRuns } from '../api/recoveryRunsApi'
import { useAppRunHistory } from './useAppRunHistory'

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
})
