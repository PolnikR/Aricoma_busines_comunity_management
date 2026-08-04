import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  useSubmitRecoveryApplication,
} from './useRecoveryApplications'
import { recoveryApplicationsQueryKey } from '../api/recoveryApplicationQueryKeys'
import type { RecoveryApplicationData } from '../model/recoveryApplicationTypes'

const data: RecoveryApplicationData = {
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
      status: 'ok',
      filename: 'Finance.json',
      local: 'C:\\projects\\abco-be\\persistency\\dag_jsons\\Finance.json',
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(recoveryApplicationsQueryKey, [])
    const { result } = renderHook(() => useSubmitRecoveryApplication(), { wrapper })

    result.current.mutate({
      fileName: 'finance_recovery',
      providerId: 'airflow-01',
      data,
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/submit_recovery_dag?filename=finance_recovery&provider_id=airflow-01&is_final=false',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(data) }),
    )
    expect(queryClient.getQueryState(recoveryApplicationsQueryKey)?.isInvalidated).toBe(true)
  })
})
