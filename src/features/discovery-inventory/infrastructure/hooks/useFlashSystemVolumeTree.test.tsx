import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFlashSystemVolumeTree } from './useFlashSystemVolumeTree'

const pool = {
  kind: 'pool',
  id: '0',
  name: 'Pool0',
  key: 'pool:0',
  detail: { id: '0', name: 'Pool0', status: 'online', volume_count: 1 },
  children: [{
    kind: 'volume',
    id: '5',
    name: 'VOL-01',
    key: 'volume:5',
    detail: { id: '5', name: 'VOL-01', status: 'online' },
    children: [],
  }],
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

let fetchMock: ReturnType<typeof vi.fn<(url: string, init?: RequestInit) => Promise<Response>>>

beforeEach(() => {
  fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() => Promise.resolve(new Response(JSON.stringify({
    counts: { pools: 1, volumes: 1, fcmaps: 0, consistency_groups: 0 },
    views: { flat: [pool] },
    provider_id: 'ibm-flashsystem-01',
    provider_type: 'FLASHCOPY',
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => { vi.unstubAllGlobals() })

describe('useFlashSystemVolumeTree', () => {
  it('loads the requested view and parses the nodes with per-kind defaults', async () => {
    const { result } = renderHook(() => useFlashSystemVolumeTree('ibm-flashsystem-01', 'flat'), { wrapper })

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/get_volume_tree?provider_id=ibm-flashsystem-01&view=flat')
    expect(result.current.data?.counts.pools).toBe(1)
    const [poolNode] = result.current.data?.nodes ?? []
    expect(poolNode?.kind).toBe('pool')
    const volume = poolNode?.children[0]
    expect(volume?.kind).toBe('volume')
    expect(volume?.kind === 'volume' ? volume.detail.host_maps : undefined).toEqual([])
  })

  it('does not request the tree without a provider id', () => {
    const { result } = renderHook(() => useFlashSystemVolumeTree(undefined, 'flat'), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not request the tree without a view', () => {
    const { result } = renderHook(() => useFlashSystemVolumeTree('ibm-flashsystem-01', undefined), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
