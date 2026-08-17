import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useVdisksByVm } from './useVdisksByVm'

afterEach(() => { vi.unstubAllGlobals() })

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { wrapper }
}

describe('useVdisksByVm', () => {
  it('does not request data without a VM name', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useVdisksByVm(''), setup())

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not request data until both providers are selected', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(
      () => useVdisksByVm('VM-01', 'provider-1'),
      setup(),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loads vdisks for the selected VM and both providers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      name: 'VM-01',
      count_vm: 1,
      count_ibm: 0,
      vdisks: {},
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(
      () => useVdisksByVm('VM-01', 'provider-1', 'flash-1'),
      setup(),
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/vdisks_by_vm?vm_name=VM-01&provider_id=provider-1&ibm_provider_id=flash-1',
      expect.any(Object),
    )
  })
})
