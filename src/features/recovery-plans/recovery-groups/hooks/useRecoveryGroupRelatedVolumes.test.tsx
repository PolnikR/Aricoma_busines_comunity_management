import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRecoveryGroupRelatedVolumes } from './useRecoveryGroupRelatedVolumes'

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}
const response = (name: string) => new Response(JSON.stringify({ name: 'VM', count_vm: 1, count_ibm: 1, vdisks: { disk: { name } } }), { status: 200, headers: { 'Content-Type': 'application/json' } })

describe('useRecoveryGroupRelatedVolumes', () => {
  afterEach(() => { vi.unstubAllGlobals() })
  it('uses the explicit Source and ignores a late result for the previous Source', async () => {
    let finishOld: (value: Response) => void = () => { throw new Error('Request not started') }
    const fetch = vi.fn((input: string) => {
      const url = new URL(input, 'http://localhost')
      expect(url.searchParams.get('provider_id')).toBe('compute')
      expect(url.searchParams.get('vm_name')).toBe('VM')
      return url.searchParams.get('ibm_provider_id') === 'source-a'
        ? new Promise<Response>(resolve => { finishOld = resolve }) : Promise.resolve(response('VOLUME-B'))
    })
    vi.stubGlobal('fetch', fetch)
    const { result, rerender } = renderHook(({ source }) => useRecoveryGroupRelatedVolumes('compute', ['VM'], source, true), { initialProps: { source: 'source-a' }, wrapper: wrapper() })
    await waitFor(() => { expect(fetch).toHaveBeenCalled() })
    rerender({ source: 'source-b' })
    await waitFor(() => { expect(result.current.discoveredVolumeNames).toEqual(['VOLUME-B']) })
    await act(async () => { finishOld(response('VOLUME-A')); await Promise.resolve() })
    expect(result.current.flashcopyProviderId).toBe('source-b')
    expect(result.current.discoveredVolumeNames).toEqual(['VOLUME-B'])
  })

  it('exposes a discovery failure and supports retry without treating it as empty success', async () => {
    let failed = true
    vi.stubGlobal('fetch', vi.fn(() => failed ? Promise.reject(new Error('Offline')) : Promise.resolve(response('VOL-01'))))
    const { result } = renderHook(() => useRecoveryGroupRelatedVolumes('compute', ['VM'], 'source', true), { wrapper: wrapper() })
    await waitFor(() => { expect(result.current.error).toBeInstanceOf(Error) })
    failed = false
    act(() => { result.current.refetch?.() })
    await waitFor(() => { expect(result.current.discoveredVolumeNames).toEqual(['VOL-01']) })
    expect(result.current.error).toBeNull()
  })
})
