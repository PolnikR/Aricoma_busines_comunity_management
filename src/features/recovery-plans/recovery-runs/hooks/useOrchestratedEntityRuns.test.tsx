import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchOrchestratorRuns } from '../api/recoveryRunsApi'
import { useOrchestratedEntityRuns } from './useOrchestratedEntityRuns'
import type { OrchestratedEntity } from '../model/recoveryRunTypes'

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

  it('queries each entity using its own providerId, one call each with limit 1', async () => {
    vi.mocked(fetchOrchestratorRuns).mockResolvedValue({
      runs: [{ runId: 'r1', status: 'success', startedAt: '2026-08-18T00:00:00Z', endedAt: '2026-08-18T00:01:00Z', durationSeconds: 60 }],
      total: 5,
    })

    const { result } = renderHook(() => useOrchestratedEntityRuns(entities), { wrapper: createWrapper() })

    await waitFor(() => { expect(result.current.every(row => !row.isLoading)).toBe(true) })

    expect(fetchOrchestratorRuns).toHaveBeenCalledTimes(2)
    expect(fetchOrchestratorRuns).toHaveBeenCalledWith('airflow-01', 'dag_260818094526_2918dccb', { limit: 1, orderBy: '-logical_date' })
    expect(fetchOrchestratorRuns).toHaveBeenCalledWith('airflow-02', 'dag_260817113000_aa11bb', { limit: 1, orderBy: '-logical_date' })
    expect(result.current[0]?.latestRun?.status).toBe('success')
  })

  it('makes zero calls when the entity list is empty', () => {
    renderHook(() => useOrchestratedEntityRuns([]), { wrapper: createWrapper() })

    expect(fetchOrchestratorRuns).not.toHaveBeenCalled()
  })
})
