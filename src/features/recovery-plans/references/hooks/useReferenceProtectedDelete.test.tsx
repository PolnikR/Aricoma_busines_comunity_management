import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGetPolicySetsQueryKey, getGetPolicySetsQueryOptions } from '@/generated/query/policy-sets/policy-sets.gen'
import { useReferenceProtectedDelete } from './useReferenceProtectedDelete'

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}
const group = { id: 'g', name: 'Group', policy_set_id: 'set' }
const application = { id: 'a', policy_set_id: 'set', application: { name: 'Application', description: '', environment: 'dev', platform: 'VMWARE', tiers: {} } }

afterEach(() => { vi.unstubAllGlobals() })

describe('useReferenceProtectedDelete', () => {
  it.each(['snapshot', 'recoveryApp', 'cleanRoom'] as const)('blocks %s policies with all named consumers', async kind => {
    const field = { snapshot: 'snapshot_policy_id', recoveryApp: 'recovery_app_policy_id', cleanRoom: 'clean_room_policy_id' }[kind]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ policy_sets: [
      { id: 'first', name: 'First', [field]: 'policy' }, { id: 'second', name: 'Second', [field]: 'policy' },
    ] })))
    const remove = vi.fn()
    const { result } = renderHook(() => useReferenceProtectedDelete())
    await act(async () => { expect(await result.current.execute({ kind, id: 'policy' }, remove)).toBe('blocked') })
    expect(remove).not.toHaveBeenCalled()
    expect(result.current.issue).toEqual({ type: 'inUse', consumers: { policySets: [{ id: 'first', name: 'First' }, { id: 'second', name: 'Second' }], groups: [], applications: [] } })
  })

  it('starts a fresh no-store request despite fresh cached empty data and waits before deleting', async () => {
    const client = new QueryClient()
    client.setQueryData(getGetPolicySetsQueryKey(), { policy_sets: [] })
    const read = deferred<Response>()
    const remove = vi.fn().mockResolvedValue(undefined)
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>().mockReturnValue(read.promise)
    vi.stubGlobal('fetch', fetch)
    const { result } = renderHook(() => useReferenceProtectedDelete())
    let run!: ReturnType<typeof result.current.execute>
    act(() => { run = result.current.execute({ kind: 'snapshot', id: 'policy' }, remove) })
    expect(result.current.phase).toBe('checking')
    expect(remove).not.toHaveBeenCalled()
    await waitFor(() => { expect(fetch).toHaveBeenCalledOnce() })
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/get_policy_sets')
    expect(fetch.mock.calls[0]?.[1]?.cache).toBe('no-store')
    expect(fetch.mock.calls[0]?.[1]?.method).toBe('GET')
    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
    await act(async () => { read.resolve(response({ policy_sets: [] })); expect(await run).toBe('deleted') })
    expect(remove).toHaveBeenCalledOnce()
    expect(result.current.phase).toBe('idle')
    client.clear()
  })

  it.each([
    [503, { detail: 'Offline' }], [403, { detail: 'Denied' }], [404, { detail: 'Missing' }], [200, {}],
  ])('fails closed for GET status %i and invalid bodies', async (status, body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(body, status)))
    const remove = vi.fn()
    const { result } = renderHook(() => useReferenceProtectedDelete())
    await act(async () => { expect(await result.current.execute({ kind: 'snapshot', id: 'policy' }, remove)).toBe('checkFailed') })
    expect(remove).not.toHaveBeenCalled()
    expect(result.current.issue).toMatchObject({ type: 'checkFailed', failures: [{ source: 'policySets' }] })
  })

  it('does not join an older in-flight query or use its empty response', async () => {
    const client = new QueryClient()
    const oldRead = deferred<Response>()
    const freshRead = deferred<Response>()
    const fetch = vi.fn().mockReturnValueOnce(oldRead.promise).mockReturnValueOnce(freshRead.promise)
    vi.stubGlobal('fetch', fetch)
    const olderQuery = client.fetchQuery(getGetPolicySetsQueryOptions())
    await waitFor(() => { expect(fetch).toHaveBeenCalledOnce() })
    const remove = vi.fn()
    const { result } = renderHook(() => useReferenceProtectedDelete())
    let pending!: ReturnType<typeof result.current.execute>
    act(() => { pending = result.current.execute({ kind: 'snapshot', id: 'p' }, remove) })
    await waitFor(() => { expect(fetch).toHaveBeenCalledTimes(2) })
    oldRead.resolve(response({ policy_sets: [] }))
    await olderQuery
    expect(remove).not.toHaveBeenCalled()
    await act(async () => {
      freshRead.resolve(response({ policy_sets: [{ id: 'ps', name: 'Policy Set', snapshot_policy_id: 'p' }] }))
      expect(await pending).toBe('blocked')
    })
    expect(remove).not.toHaveBeenCalled()
    client.clear()
  })

  it('waits for the delayed second source even after the first GET fails', async () => {
    const apps = deferred<Response>()
    vi.stubGlobal('fetch', vi.fn((url: string) => url.endsWith('get_recovery_groups')
      ? Promise.resolve(response({}, 500)) : apps.promise))
    const remove = vi.fn()
    const { result } = renderHook(() => useReferenceProtectedDelete())
    let pending!: ReturnType<typeof result.current.execute>
    act(() => { pending = result.current.execute({ kind: 'policySet', id: 'set' }, remove) })
    await act(async () => { await Promise.resolve() })
    expect(result.current.phase).toBe('checking')
    expect(remove).not.toHaveBeenCalled()
    await act(async () => { apps.resolve(response({})); expect(await pending).toBe('checkFailed') })
    expect(result.current.issue).toMatchObject({ type: 'checkFailed', failures: [{ source: 'groups' }, { source: 'applications' }] })
    expect(remove).not.toHaveBeenCalled()
  })

  it.each([
    [[group], [], 'blocked'], [[], [application], 'blocked'], [[group], [application], 'blocked'], [[], [], 'deleted'],
  ] as const)('checks both policy-set collections before deciding', async (groups, apps, expected) => {
    const reads: string[] = []
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      reads.push(url)
      return Promise.resolve(response(url.endsWith('get_recovery_groups') ? { recovery_groups: groups } : { applications: apps }))
    }))
    const remove = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useReferenceProtectedDelete())
    await act(async () => { expect(await result.current.execute({ kind: 'policySet', id: 'set' }, remove)).toBe(expected) })
    expect(reads).toEqual(['/api/get_recovery_groups', '/api/get_recovery_apps'])
    expect(remove).toHaveBeenCalledTimes(expected === 'deleted' ? 1 : 0)
  })

  it.each([{ failedSources: ['groups'] }, { failedSources: ['applications'] }, { failedSources: ['groups', 'applications'] }])('fails closed when policy-set sources fail: $failedSources', async ({ failedSources }) => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      const source = url.endsWith('get_recovery_groups') ? 'groups' : 'applications'
      return Promise.resolve(failedSources.includes(source) ? response({ detail: 'Unavailable' }, 500) : response(source === 'groups' ? { recovery_groups: [] } : { applications: [] }))
    }))
    const remove = vi.fn()
    const { result } = renderHook(() => useReferenceProtectedDelete())
    await act(async () => { expect(await result.current.execute({ kind: 'policySet', id: 'set' }, remove)).toBe('checkFailed') })
    expect(remove).not.toHaveBeenCalled()
    expect(result.current.issue).toMatchObject({ type: 'checkFailed', failures: failedSources.map(source => ({ source })) })
  })

  it('does not repeat checks or DELETE while either phase is pending', async () => {
    const read = deferred<Response>()
    const deletion = deferred<undefined>()
    const fetch = vi.fn().mockReturnValue(read.promise)
    vi.stubGlobal('fetch', fetch)
    const remove = vi.fn(() => deletion.promise)
    const { result } = renderHook(() => useReferenceProtectedDelete())
    let first!: ReturnType<typeof result.current.execute>
    act(() => {
      first = result.current.execute({ kind: 'snapshot', id: 'policy' }, remove)
      void result.current.execute({ kind: 'snapshot', id: 'policy' }, remove)
    })
    await act(async () => { read.resolve(response({ policy_sets: [] })); await read.promise })
    expect(result.current.phase).toBe('deleting')
    await act(async () => { expect(await result.current.execute({ kind: 'snapshot', id: 'policy' }, remove)).toBe('ignored') })
    expect(fetch).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledOnce()
    await act(async () => { deletion.resolve(undefined); await first })
  })

  it('rechecks after failure and leaves DELETE errors to the existing mutation', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValue(response({ policy_sets: [] }))
    vi.stubGlobal('fetch', fetch)
    const remove = vi.fn().mockRejectedValue(new Error('DELETE conflict'))
    const { result } = renderHook(() => useReferenceProtectedDelete())
    await act(async () => { expect(await result.current.execute({ kind: 'snapshot', id: 'p' }, remove)).toBe('checkFailed') })
    act(() => { result.current.reset() })
    expect(result.current.issue).toBeNull()
    await act(async () => { expect(await result.current.execute({ kind: 'snapshot', id: 'p' }, remove)).toBe('deleteFailed') })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(result.current.issue).toBeNull()
  })

  it('aborts and never deletes when an unmounted check settles', async () => {
    const read = deferred<Response>()
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>().mockReturnValue(read.promise)
    vi.stubGlobal('fetch', fetch)
    const remove = vi.fn()
    const { result, unmount } = renderHook(() => useReferenceProtectedDelete(), { wrapper: StrictMode })
    let pending!: ReturnType<typeof result.current.execute>
    act(() => { pending = result.current.execute({ kind: 'snapshot', id: 'p' }, remove) })
    await waitFor(() => { expect(fetch).toHaveBeenCalledOnce() })
    const signal = fetch.mock.calls[0]?.[1]?.signal
    unmount()
    expect(signal?.aborted).toBe(true)
    read.resolve(response({ policy_sets: [] }))
    expect(await pending).toBe('ignored')
    expect(remove).not.toHaveBeenCalled()
  })
})
