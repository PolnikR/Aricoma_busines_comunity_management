import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRecoveryGroupMetroMirrorRelationships } from './useRecoveryGroupMetroMirrorRelationships'

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}
const response = (provider = 'source', name = 'VOL') => new Response(JSON.stringify({ provider_id: provider, volumes: [{ name, status: 'ok', auxiliary_name: `AUX-${name}` }], consistency_group_id: '001' }), { status: 200, headers: { 'Content-Type': 'application/json' } })

describe('useRecoveryGroupMetroMirrorRelationships', () => {
  afterEach(() => { vi.unstubAllGlobals() })
  it('uses source and unique sorted repeated volume names, and waits until enabled', async () => {
    const fetch = vi.fn<(input: string) => Promise<Response>>(() => Promise.resolve(response()))
    vi.stubGlobal('fetch', fetch)
    const { result, rerender } = renderHook(({ enabled }) => useRecoveryGroupMetroMirrorRelationships('source', ['B', 'A', 'A'], enabled), { initialProps: { enabled: false }, wrapper: wrapper() })
    expect(fetch).not.toHaveBeenCalled()
    rerender({ enabled: true })
    await waitFor(() => { expect(result.current.data?.consistency_group_id).toBe('001') })
    const url = new URL(fetch.mock.calls[0]?.[0] ?? '', 'http://localhost')
    expect(url.searchParams.get('provider_id')).toBe('source')
    expect(url.searchParams.getAll('volume_names')).toEqual(['A', 'B'])
  })
  it('does not fetch an empty selection or missing source', () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    renderHook(() => useRecoveryGroupMetroMirrorRelationships(null, ['VOL'], true), { wrapper: wrapper() })
    renderHook(() => useRecoveryGroupMetroMirrorRelationships('source', [], true), { wrapper: wrapper() })
    expect(fetch).not.toHaveBeenCalled()
  })
  it('ignores late responses for a previous source and selection', async () => {
    let finishOld: (value: Response) => void = () => { throw Error('not started') }
    vi.stubGlobal('fetch', vi.fn((input: string) => input.includes('provider_id=old') ? new Promise<Response>(resolve => { finishOld = resolve }) : Promise.resolve(response('source', 'NEW'))))
    const { result, rerender } = renderHook(({ source, names }) => useRecoveryGroupMetroMirrorRelationships(source, names, true), { initialProps: { source: 'old', names: ['OLD'] }, wrapper: wrapper() })
    await waitFor(() => { expect(result.current.isLoading).toBe(true) })
    rerender({ source: 'source', names: ['NEW'] })
    await waitFor(() => { expect(result.current.data?.volumes[0]?.name).toBe('NEW') })
    await act(async () => { finishOld(response('old', 'OLD')); await Promise.resolve() })
    expect(result.current.data?.volumes[0]?.name).toBe('NEW')
  })
  it('exposes network failure and recovers through retry', async () => {
    let offline = true
    vi.stubGlobal('fetch', vi.fn(() => offline ? Promise.reject(new Error('Offline')) : Promise.resolve(response())))
    const { result } = renderHook(() => useRecoveryGroupMetroMirrorRelationships('source', ['VOL'], true), { wrapper: wrapper() })
    await waitFor(() => { expect(result.current.error).toBeInstanceOf(Error) })
    expect(result.current.data).toBeUndefined()
    offline = false
    await act(async () => { await result.current.refetch() })
    await waitFor(() => { expect(result.current.data?.consistency_group_id).toBe('001') })
  })
  it('rejects a mismatching provider and supports retry', async () => {
    let provider = 'wrong'
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response(provider))))
    const { result } = renderHook(() => useRecoveryGroupMetroMirrorRelationships('source', ['VOL'], true), { wrapper: wrapper() })
    await waitFor(() => { expect(result.current.error).toBeInstanceOf(Error) })
    expect(result.current.data).toBeUndefined()
    provider = 'source'
    await act(async () => { await result.current.refetch() })
    await waitFor(() => { expect(result.current.data?.provider_id).toBe('source') })
  })
})
