import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { useTestProviderConnection } from './useTestProviderConnection'
import type { ProviderRecord } from '../model/providerTypes'

const provider: ProviderRecord = {
  id: 'vmware-vcenter-01',
  name: 'Production vCenter',
  description: 'Primary vCenter',
  type: 'VMWARE',
  ipAddress: '10.99.99.40',
  credentialId: 'vcenter-admin',
  credentialStatus: 'ok',
}

describe('useTestProviderConnection', () => {
  it('returns a successful development mock for the selected provider', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useTestProviderConnection(), { wrapper })

    result.current.mutate(provider)

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(result.current.data?.status).toBe('success')
    expect(result.current.data?.source).toBe('mock')
    expect(result.current.data?.providerInfo?.ipAddress).toBe(provider.ipAddress)
  })
})
