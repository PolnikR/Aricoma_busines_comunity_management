import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useOrchestratedGroups } from './useOrchestratedGroups'

const { useRecoveryGroupsMock } = vi.hoisted(() => ({
  useRecoveryGroupsMock: vi.fn(),
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

function group(
  id: string,
  name: string,
  overrides: { airflowRunId?: string | null; pushToOrchestrator?: boolean; orchestrationProviderId?: string | null } = {},
) {
  return {
    id,
    name,
    pushToOrchestrator: true,
    airflowRunId: 'run_1',
    orchestrationProviderId: 'airflow-01',
    ...overrides,
  }
}

function mockUseRecoveryGroups(groups: unknown[]) {
  useRecoveryGroupsMock.mockReturnValue({
    groups,
    isLoading: false,
    isFetching: false,
    error: null,
    refresh: vi.fn(),
  })
}

describe('useOrchestratedGroups', () => {
  it('includes only groups with pushToOrchestrator, a real airflowRunId, and a resolved orchestrationProviderId', () => {
    mockUseRecoveryGroups([
      group('finance_group', 'Finance Group', { airflowRunId: '260818094526_2918dccb' }),
      group('draft_group', 'Draft Group', { airflowRunId: null }),
      group('never_pushed', 'Never Pushed', { pushToOrchestrator: false }),
      group('no_provider', 'No Provider', { orchestrationProviderId: null }),
    ])

    const { result } = renderHook(() => useOrchestratedGroups(), { wrapper: createWrapper() })

    expect(result.current.entities).toEqual([
      {
        entityType: 'group',
        id: 'finance_group',
        name: 'Finance Group',
        dagId: 'dag_260818094526_2918dccb',
        providerId: 'airflow-01',
      },
    ])
  })

  it('returns an empty list when there are no orchestrated groups', () => {
    mockUseRecoveryGroups([])

    const { result } = renderHook(() => useOrchestratedGroups(), { wrapper: createWrapper() })

    expect(result.current.entities).toEqual([])
  })
})
