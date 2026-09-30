import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStoredBoolean } from './useStoredBoolean'

const KEY = 'test.stored-boolean'

describe('useStoredBoolean', () => {
  beforeEach(() => { localStorage.clear() })
  afterEach(() => { vi.restoreAllMocks() })

  it('starts at the default when nothing is stored', () => {
    const { result } = renderHook(() => useStoredBoolean(KEY, true))
    expect(result.current[0]).toBe(true)
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('reads a stored value and ignores unknown values', () => {
    localStorage.setItem(KEY, 'false')
    expect(renderHook(() => useStoredBoolean(KEY, true)).result.current[0]).toBe(false)

    localStorage.setItem(KEY, 'yes')
    expect(renderHook(() => useStoredBoolean(KEY, true)).result.current[0]).toBe(true)
  })

  it('persists changes for the next mount', () => {
    const { result, unmount } = renderHook(() => useStoredBoolean(KEY, true))
    act(() => { result.current[1](false) })
    expect(result.current[0]).toBe(false)
    expect(localStorage.getItem(KEY)).toBe('false')

    unmount()
    expect(renderHook(() => useStoredBoolean(KEY, true)).result.current[0]).toBe(false)
  })

  it('keeps working in memory when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })

    const { result } = renderHook(() => useStoredBoolean(KEY, true))
    expect(result.current[0]).toBe(true)
    act(() => { result.current[1](false) })
    expect(result.current[0]).toBe(false)
  })
})
