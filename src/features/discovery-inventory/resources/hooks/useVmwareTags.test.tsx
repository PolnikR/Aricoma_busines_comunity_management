import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTags } from './useVmwareTags'
import { discoveryInventoryKeys } from '../api/resourceInventoryQueryKeys'

afterEach(() => { vi.unstubAllGlobals() })

describe('useTags', () => {
  it('loads tag names into the shared tag cache', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      count: 2,
      tags: [{ id: '1', name: 'prod' }, { id: '2', name: 'db' }],
    }), { status: 200 })))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useTags('vmware-vcenter-01'), { wrapper })
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(result.current.data).toEqual(['prod', 'db'])
    expect(client.getQueryData(discoveryInventoryKeys.tags('vmware-vcenter-01'))).toEqual(['prod', 'db'])
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('/api/tags?provider_id=vmware-vcenter-01')
  })

  it('does not fetch tags without a provider ID', async () => {
    const mock = vi.fn()
    vi.stubGlobal('fetch', mock)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useTags(null), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mock).not.toHaveBeenCalled()
  })
})
