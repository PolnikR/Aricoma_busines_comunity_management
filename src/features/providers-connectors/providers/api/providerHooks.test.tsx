import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { providerKeys } from './providerQueryKeys'
import { useDeleteProvider } from './useDeleteProvider'
import { useProviders } from './useProviders'
import type { ProviderRecord } from '../model/providerTypes'

const provider: ProviderRecord = {
  id: 'vcenter-01',
  name: 'Production vCenter',
  description: 'Primary',
  type: 'VMWARE',
  ipAddress: '10.0.0.1',
  credentialId: 'vcenter-admin',
  credentialStatus: 'ok',
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

describe('provider query hooks', () => {
  it('loads providers into the provider list cache', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ providers: [provider] }), { status: 200 }),
    ))
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useProviders(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([provider])
    expect(queryClient.getQueryData(providerKeys.list())).toEqual([provider])
  })

  it('replaces the provider cache with the delete response', async () => {
    const remaining = [{ ...provider, id: 'vcenter-02' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ providers: remaining }), { status: 200 }),
    ))
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(providerKeys.list(), [provider, ...remaining])
    const { result } = renderHook(() => useDeleteProvider(), { wrapper })

    result.current.mutate(provider.id)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(queryClient.getQueryData(providerKeys.list())).toEqual(remaining)
  })
})
