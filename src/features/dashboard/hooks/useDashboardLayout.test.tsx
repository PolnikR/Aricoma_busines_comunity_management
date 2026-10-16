import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDashboardLayout } from './useDashboardLayout'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('dashboard host layout', () => {
  it('follows host dimensions, not the monitor width, and releases its observer', () => {
    let notify: (() => void) | undefined
    let size = { width: 980, height: 520 }
    const disconnect = vi.fn()
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { notify = callback }
      observe() { /* Controlled resize notification below. */ }
      disconnect = disconnect
    })
    const host = document.createElement('div')
    vi.spyOn(host, 'getBoundingClientRect').mockImplementation(() => DOMRect.fromRect(size))
    const { result, rerender, unmount } = renderHook(() => useDashboardLayout(host))
    expect(result.current).toBe('compact')
    act(() => { size = { width: 896, height: 444 }; notify?.() })
    expect(result.current).toBe('sections')
    act(() => { size = { width: 400, height: 650 }; notify?.() })
    expect(result.current).toBe('sections')
    act(() => { size = { width: 1534, height: 950 }; notify?.() })
    expect(result.current).toBe('wide')
    rerender()
    expect(result.current).toBe('wide')
    act(() => { size = { width: 1534, height: 420 }; notify?.() })
    expect(result.current).toBe('sections')
    unmount()
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it('measures once if ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    const host = document.createElement('div')
    vi.spyOn(host, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ width: 320, height: 600 }))
    const { result } = renderHook(() => useDashboardLayout(host))
    expect(result.current).toBe('sections')
  })
})
