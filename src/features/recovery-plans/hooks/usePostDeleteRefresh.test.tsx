import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePostDeleteRefresh } from './usePostDeleteRefresh'

function deferred() {
  let resolve!: (value: { isError: boolean }) => void
  const promise = new Promise<{ isError: boolean }>(done => { resolve = done })
  return { promise, resolve }
}

describe('usePostDeleteRefresh', () => {
  it('keeps ordinary refresh in idle while awaiting its result', async () => {
    const request = deferred()
    const refreshList = vi.fn(() => request.promise)
    const { result } = renderHook(() => usePostDeleteRefresh(refreshList))
    let pending!: Promise<void>
    act(() => { pending = result.current.refresh() })
    expect(result.current.phase).toBe('idle')
    await act(async () => { request.resolve({ isError: false }); await pending })
    expect(result.current.phase).toBe('idle')
  })

  it.each([false, true])('waits for post-delete refresh and finishes with isError=%s', async isError => {
    const request = deferred()
    const { result } = renderHook(() => usePostDeleteRefresh(() => request.promise))
    let pending!: Promise<void>
    act(() => { pending = result.current.afterDelete() })
    expect(result.current.phase).toBe('refreshing')
    await act(async () => { request.resolve({ isError }); await pending })
    expect(result.current.phase).toBe(isError ? 'error' : 'idle')
  })

  it('joins repeated refresh actions and retries the failed post-delete operation', async () => {
    const first = deferred()
    const second = deferred()
    const refreshList = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result } = renderHook(() => usePostDeleteRefresh(refreshList))
    let pending!: Promise<void>
    act(() => { pending = result.current.afterDelete(); void result.current.afterDelete(); void result.current.refresh() })
    expect(refreshList).toHaveBeenCalledOnce()
    await act(async () => { first.resolve({ isError: true }); await pending })
    act(() => { pending = result.current.refresh() })
    expect(result.current.phase).toBe('refreshing')
    await act(async () => { second.resolve({ isError: false }); await pending })
    expect(refreshList).toHaveBeenCalledTimes(2)
    expect(result.current.phase).toBe('idle')
  })

  it('handles a rejected callback and an immediately resolved retry', async () => {
    const refreshList = vi.fn().mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce({ isError: false })
    const { result } = renderHook(() => usePostDeleteRefresh(refreshList))
    await act(async () => { await result.current.afterDelete() })
    expect(result.current.phase).toBe('error')
    await act(async () => { await result.current.refresh() })
    expect(result.current.phase).toBe('idle')
  })

  it('does not carry an old operation into a newly mounted instance', async () => {
    const request = deferred()
    const previous = renderHook(() => usePostDeleteRefresh(() => request.promise))
    let pending!: Promise<void>
    act(() => { pending = previous.result.current.afterDelete() })
    previous.unmount()
    const next = renderHook(() => usePostDeleteRefresh(() => Promise.resolve({ isError: false })))
    await act(async () => { request.resolve({ isError: true }); await pending })
    expect(next.result.current.phase).toBe('idle')
  })
})
