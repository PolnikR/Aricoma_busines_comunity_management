import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDeleteProvider } from './useDeleteProvider'
import { providerKeys } from '../api/providerQueryKeys'

afterEach(() => { vi.unstubAllGlobals() })

describe('useDeleteProvider', () => {
  it('replaces the provider cache with the delete response', async () => {
    const remaining = [{
      id: 'provider-2',
      name: 'Remaining',
      description: '',
      type: 'VMWARE',
      ipAddress: '10.0.0.2',
      port: 22,
      credentialId: null,
      role: 'source',
      credentialStatus: 'none',
    }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ providers: remaining }), { status: 200 }),
    ))
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useDeleteProvider(), { wrapper })
    const targetProvider = { ...remaining[0], id: 'provider-target', role: 'target' as const }
    client.setQueryData(providerKeys.list('all'), [...remaining, targetProvider])
    client.setQueryData(providerKeys.list('source'), remaining)
    client.setQueryData(providerKeys.list('target'), [targetProvider])

    result.current.mutate('provider-1')
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(client.getQueryState(providerKeys.list('all'))?.isInvalidated).toBe(true)
    expect(client.getQueryState(providerKeys.list('source'))?.isInvalidated).toBe(true)
    expect(client.getQueryState(providerKeys.list('target'))?.isInvalidated).toBe(true)
  })
})
