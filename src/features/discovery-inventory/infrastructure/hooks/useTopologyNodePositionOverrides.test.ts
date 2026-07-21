import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTopologyNodePositionOverrides } from './useTopologyNodePositionOverrides'

const STORAGE_KEY = 'abcm-fe.infrastructure-topology.node-positions.v1'

describe('useTopologyNodePositionOverrides', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('initializes with empty overrides when storage is empty', () => {
    const { result } = renderHook(() => useTopologyNodePositionOverrides())

    expect(result.current.overrides).toEqual({})
    expect(result.current.hasOverrides).toBe(false)
  })

  it('reads stored overrides from localStorage on mount', () => {
    const stored = { 'host:esx-01': { x: 100, y: 200 }, 'vm:vm-42': { x: 300, y: 400 } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

    const { result } = renderHook(() => useTopologyNodePositionOverrides())

    expect(result.current.overrides).toEqual(stored)
    expect(result.current.hasOverrides).toBe(true)
  })

  it('setOverride adds or updates a position and persists to localStorage', () => {
    const { result } = renderHook(() => useTopologyNodePositionOverrides())

    act(() => {
      result.current.setOverride('host:esx-01', { x: 100, y: 200 })
    })

    expect(result.current.overrides).toEqual({ 'host:esx-01': { x: 100, y: 200 } })
    expect(localStorage.getItem(STORAGE_KEY)).toBe(
      JSON.stringify({ 'host:esx-01': { x: 100, y: 200 } }),
    )
  })

  it('setOverride can add multiple positions', () => {
    const { result } = renderHook(() => useTopologyNodePositionOverrides())

    act(() => {
      result.current.setOverride('host:esx-01', { x: 100, y: 200 })
      result.current.setOverride('vm:vm-42', { x: 300, y: 400 })
    })

    expect(result.current.overrides).toEqual({
      'host:esx-01': { x: 100, y: 200 },
      'vm:vm-42': { x: 300, y: 400 },
    })
  })

  it('clearOverrides removes all overrides and clears localStorage', () => {
    const stored = { 'host:esx-01': { x: 100, y: 200 } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

    const { result } = renderHook(() => useTopologyNodePositionOverrides())

    expect(result.current.hasOverrides).toBe(true)

    act(() => {
      result.current.clearOverrides()
    })

    expect(result.current.overrides).toEqual({})
    expect(result.current.hasOverrides).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('falls back to empty overrides on corrupted JSON in storage', () => {
    localStorage.setItem(STORAGE_KEY, 'not valid json {')

    const { result } = renderHook(() => useTopologyNodePositionOverrides())

    expect(result.current.overrides).toEqual({})
  })

  it('falls back to empty overrides on invalid schema in storage', () => {
    const invalid = { 'host:esx-01': { x: 'not-a-number', y: 200 } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invalid))

    const { result } = renderHook(() => useTopologyNodePositionOverrides())

    expect(result.current.overrides).toEqual({})
  })

  it('silently handles localStorage.setItem failure (e.g., private mode)', () => {
    const { result } = renderHook(() => useTopologyNodePositionOverrides())

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError')
    })

    act(() => {
      result.current.setOverride('host:esx-01', { x: 100, y: 200 })
    })

    // State should still update even if storage write fails
    expect(result.current.overrides).toEqual({ 'host:esx-01': { x: 100, y: 200 } })

    setItemSpy.mockRestore()
  })

  it('silently handles localStorage.removeItem failure', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'host:esx-01': { x: 100, y: 200 } }))

    const { result } = renderHook(() => useTopologyNodePositionOverrides())

    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError')
    })

    act(() => {
      result.current.clearOverrides()
    })

    // State should still be cleared even if storage removal fails
    expect(result.current.overrides).toEqual({})

    removeItemSpy.mockRestore()
  })
})
