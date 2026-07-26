import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { useDiscoveryInventory } from './useDiscoveryInventory'

function wrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useDiscoveryInventory', () => {
  it('shares one request between consumers with the same filters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      count: 0,
      vms: [],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const queryWrapper = wrapper(queryClient)

    const first = renderHook(
      () => useDiscoveryInventory('vcenter-01', 'prod'),
      { wrapper: queryWrapper },
    )
    const second = renderHook(
      () => useDiscoveryInventory('vcenter-01', 'prod'),
      { wrapper: queryWrapper },
    )

    await waitFor(() => {
      expect(first.result.current.isSuccess).toBe(true)
      expect(second.result.current.isSuccess).toBe(true)
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/vms_by_tag?tag=prod&provider_id=vcenter-01',
      expect.any(Object),
    )
  })
})
