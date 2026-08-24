import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useOrchestratedApps } from './useOrchestratedApps'

const { useRecoveryApplicationsMock } = vi.hoisted(() => ({
  useRecoveryApplicationsMock: vi.fn(),
}))

vi.mock('@/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications', () => ({
  useRecoveryApplications: useRecoveryApplicationsMock,
}))

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function app(
  id: string,
  name: string,
  overrides: { airflowRunId?: string | null; orchestrationProviderId?: string | null; pushToOrchestrator?: boolean } = {},
) {
  return {
    id,
    data: { application: { name } },
    airflowRunId: 'run_1',
    orchestrationProviderId: 'airflow-01',
    pushToOrchestrator: true,
    ...overrides,
  }
}

function mockUseRecoveryApplications(data: unknown[]) {
  useRecoveryApplicationsMock.mockReturnValue({
    data,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  })
}

describe('useOrchestratedApps', () => {
  it('includes only apps with a real airflowRunId and a resolved orchestrationProviderId, computing dagId as dag_<run id>', () => {
    mockUseRecoveryApplications([
      app('finance_recovery', 'Finance Recovery', { airflowRunId: '260818094526_2918dccb' }),
      app('draft_app', 'Draft App', { airflowRunId: null }),
      app('no_provider', 'No Provider', { orchestrationProviderId: null }),
    ])

    const { result } = renderHook(() => useOrchestratedApps(), { wrapper: createWrapper() })

    expect(result.current.entities).toEqual([
      {
        entityType: 'application',
        id: 'finance_recovery',
        name: 'Finance Recovery',
        dagId: 'dag_260818094526_2918dccb',
        providerId: 'airflow-01',
      },
    ])
  })

  it('ignores push_to_orchestrator=true when there is no airflow_run_id', () => {
    mockUseRecoveryApplications([
      app('failed_submit', 'Failed Submit', { airflowRunId: null, pushToOrchestrator: true }),
    ])

    const { result } = renderHook(() => useOrchestratedApps(), { wrapper: createWrapper() })

    expect(result.current.entities).toEqual([])
  })

  it('returns an empty list when there are no orchestrated apps', () => {
    mockUseRecoveryApplications([])

    const { result } = renderHook(() => useOrchestratedApps(), { wrapper: createWrapper() })

    expect(result.current.entities).toEqual([])
  })
})
