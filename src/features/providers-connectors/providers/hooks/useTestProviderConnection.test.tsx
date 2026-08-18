import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTestProviderConnection } from './useTestProviderConnection'
import type { ProviderRecord } from '../model/providerTypes'

afterEach(() => { vi.unstubAllGlobals() })

const provider: ProviderRecord = {
  id: 'vmware-vcenter-01',
  name: 'Production vCenter',
  description: 'Primary vCenter',
  type: 'VMWARE',
  ipAddress: '10.99.99.40',
  port: 22,
  credentialId: 'vcenter-admin',
  credentialStatus: 'ok',
}

describe('useTestProviderConnection', () => {
  it('returns the real backend connection test result for the selected provider', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          provider_id: 'vmware-vcenter-01',
          provider_type: 'VMWARE',
          ok: true,
          checks: [{ name: 'Credentials', status: 'ok', detail: 'Credential validated' }],
        }),
        { status: 200 },
      ),
    ))
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useTestProviderConnection(), { wrapper })

    result.current.mutate(provider)

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(result.current.data?.ok).toBe(true)
    expect(result.current.data?.providerId).toBe('vmware-vcenter-01')
    expect(result.current.data?.checks).toEqual([
      { name: 'Credentials', status: 'ok', detail: 'Credential validated' },
    ])
  })
})
