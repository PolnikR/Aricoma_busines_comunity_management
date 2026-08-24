import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useVmsByName } from './useVmsByName'
import { discoveryInventoryKeys } from '../api/resourceInventoryQueryKeys'

afterEach(() => { vi.unstubAllGlobals() })

describe('useVmsByName', () => {
  it('loads vms by name into the query cache', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      count: 1,
      vms: [{ name: 'WEB-01' }],
    }), { status: 200 })))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useVmsByName('WEB', 'vmware-vcenter-01'), { wrapper })
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(result.current.data?.count).toBe(1)
    expect(result.current.data?.vms.map(vm => vm.name)).toEqual(['WEB-01'])
    expect(client.getQueryData(discoveryInventoryKeys.rawVmsByName('WEB', 'vmware-vcenter-01')))
      .toEqual(result.current.data)
  })

  it('does not fetch when disabled', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useVmsByName('WEB', undefined, false), { wrapper })

    expect(result.current.isPending).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
