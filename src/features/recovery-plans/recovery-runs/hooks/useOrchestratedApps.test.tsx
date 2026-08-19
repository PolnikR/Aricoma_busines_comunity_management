import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useOrchestratedApps } from './useOrchestratedApps'

const { useRecoveryApplicationsMock, usePlatformProvidersMock } = vi.hoisted(() => ({
  useRecoveryApplicationsMock: vi.fn(),
  usePlatformProvidersMock: vi.fn(),
}))

vi.mock('@/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications', () => ({
  useRecoveryApplications: useRecoveryApplicationsMock,
}))
vi.mock('@/features/platform-administration/platform-providers/hooks/usePlatformProviders', () => ({
  usePlatformProviders: usePlatformProvidersMock,
}))

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function app(id: string, name: string, airflowRunId?: string | null, pushToOrchestrator = true) {
  return {
    id,
    data: { application: { name } },
    airflowRunId,
    pushToOrchestrator,
  }
}

describe('useOrchestratedApps', () => {
  it('includes only apps with a real airflow_run_id, computing dagId as dag_<run id>', () => {
    useRecoveryApplicationsMock.mockReturnValue({
      data: [
        app('finance_recovery', 'Finance Recovery', '260818094526_2918dccb'),
        app('draft_app', 'Draft App', null),
        app('never_pushed', 'Never Pushed', undefined, false),
      ],
      isLoading: false,
      error: null,
    })
    usePlatformProvidersMock.mockReturnValue({
      data: [{ id: 'airflow-01', credentialStatus: 'ok' }],
      isLoading: false,
      error: null,
    })

    const { result } = renderHook(() => useOrchestratedApps(), { wrapper: createWrapper() })

    expect(result.current.apps).toEqual([
      { id: 'finance_recovery', name: 'Finance Recovery', dagId: 'dag_260818094526_2918dccb' },
    ])
    expect(result.current.providerId).toBe('airflow-01')
  })

  it('ignores push_to_orchestrator=true when there is no airflow_run_id', () => {
    useRecoveryApplicationsMock.mockReturnValue({
      data: [app('failed_submit', 'Failed Submit', null, true)],
      isLoading: false,
      error: null,
    })
    usePlatformProvidersMock.mockReturnValue({ data: [], isLoading: false, error: null })

    const { result } = renderHook(() => useOrchestratedApps(), { wrapper: createWrapper() })

    expect(result.current.apps).toEqual([])
  })

  it('returns providerId null when no eligible platform provider exists', async () => {
    useRecoveryApplicationsMock.mockReturnValue({ data: [], isLoading: false, error: null })
    usePlatformProvidersMock.mockReturnValue({
      data: [{ id: 'airflow-01', credentialStatus: 'missing' }],
      isLoading: false,
      error: null,
    })

    const { result } = renderHook(() => useOrchestratedApps(), { wrapper: createWrapper() })

    await waitFor(() => { expect(result.current.providerId).toBeNull() })
  })
})
