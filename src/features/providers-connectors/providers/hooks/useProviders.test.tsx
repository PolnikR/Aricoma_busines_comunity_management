import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useProviders } from './useProviders'
import { providerKeys } from '../api/providerQueryKeys'

afterEach(() => { vi.unstubAllGlobals() })

describe('useProviders', () => {
  it('loads providers into the provider list cache', async () => {
    const provider = {
      id: 'vcenter-01',
      name: 'Production',
      description: 'Primary',
      type: 'VMWARE',
      ipAddress: '10.0.0.1',
      port: 22,
      credentialId: 'vcenter-admin',
      role: 'source',
      credentialStatus: 'ok',
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ providers: [provider] }), { status: 200 }),
    ))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useProviders(), { wrapper })
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(result.current.data).toEqual([provider])
    expect(client.getQueryData(providerKeys.list())).toEqual([provider])
  })
})
