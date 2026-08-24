import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useOrchestratedEntities } from './useOrchestratedEntities'

const { useRecoveryApplicationsMock, useRecoveryGroupsMock } = vi.hoisted(() => ({
  useRecoveryApplicationsMock: vi.fn(),
  useRecoveryGroupsMock: vi.fn(),
}))

vi.mock('@/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications', () => ({
  useRecoveryApplications: useRecoveryApplicationsMock,
}))
vi.mock('@/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups', () => ({
  useRecoveryGroups: useRecoveryGroupsMock,
}))

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useOrchestratedEntities', () => {
  it('concatenates orchestrated apps and groups, each with their own resolved providerId', () => {
    useRecoveryApplicationsMock.mockReturnValue({
      data: [{
        id: 'finance_recovery',
        data: { application: { name: 'Finance Recovery' } },
        airflowRunId: 'app_run_1',
        orchestrationProviderId: 'airflow-01',
      }],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    })
    useRecoveryGroupsMock.mockReturnValue({
      groups: [{
        id: 'finance_group',
        name: 'Finance Group',
        pushToOrchestrator: true,
        airflowRunId: 'group_run_1',
        orchestrationProviderId: 'airflow-02',
      }],
      isLoading: false,
      isFetching: false,
      error: null,
      refresh: vi.fn(),
    })

    const { result } = renderHook(() => useOrchestratedEntities(), { wrapper: createWrapper() })

    expect(result.current.entities).toEqual([
      {
        entityType: 'application',
        id: 'finance_recovery',
        name: 'Finance Recovery',
        dagId: 'dag_app_run_1',
        providerId: 'airflow-01',
      },
      {
        entityType: 'group',
        id: 'finance_group',
        name: 'Finance Group',
        dagId: 'dag_group_run_1',
        providerId: 'airflow-02',
      },
    ])
  })
})
