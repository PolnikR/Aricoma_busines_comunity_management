import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  useSubmitRecoveryApplication,
} from './useRecoveryApplications'
import { getGetRecoveryAppsQueryKey } from '@/generated/query/recovery-apps/recovery-apps.gen'
import type { RecoveryApplicationData } from '../model/recoveryApplicationTypes'

const data: RecoveryApplicationData = {
  id: 'finance-recovery',
  policy_set_id: 'test_1_hour_ps',
  application: {
    name: 'Finance',
    description: 'Finance recovery',
    environment: 'prod',
    platform: 'VMware vCenter ESXi',
    source_connection: 'vcenter_default',
    target_connection: 'vcenter_default_destination',
    tiers: {},
  },
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('recovery application hooks', () => {
  it('submits to the real DAG endpoint and invalidates the backend list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      applications: [],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(getGetRecoveryAppsQueryKey(), { applications: [] })
    const { result } = renderHook(() => useSubmitRecoveryApplication(), { wrapper })

    result.current.mutate({
      providerId: 'airflow-01',
      data,
      pushToOrchestrator: false,
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/submit_recovery_dag?provider_id=airflow-01&push_to_orchestrator=false',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(data) }),
    )
    expect(queryClient.getQueryState(getGetRecoveryAppsQueryKey())?.isInvalidated).toBe(true)
  })
})
