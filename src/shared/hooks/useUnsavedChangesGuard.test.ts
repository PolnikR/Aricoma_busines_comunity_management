import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard'

vi.mock('react-router', () => ({
  useBlocker: () => ({ state: 'unblocked' as const }),
}))

describe('useUnsavedChangesGuard', () => {
  it('runs clean navigation immediately and asks before dirty navigation', () => {
    const action = vi.fn()
    const { result, rerender } = renderHook(
      ({ isDirty }: { isDirty: boolean }) => useUnsavedChangesGuard(isDirty),
      { initialProps: { isDirty: false } },
    )

    act(() => { result.current.requestNavigation(action) })
    expect(action).toHaveBeenCalledOnce()

    rerender({ isDirty: true })
    act(() => { result.current.requestNavigation(action) })
    expect(result.current.isNavigationBlocked).toBe(true)
    expect(action).toHaveBeenCalledOnce()

    act(() => { result.current.confirmNavigation() })
    expect(action).toHaveBeenCalledTimes(2)
  })

  it('prevents browser unload only while dirty', () => {
    const { rerender, unmount } = renderHook(
      ({ isDirty }: { isDirty: boolean }) => useUnsavedChangesGuard(isDirty),
      { initialProps: { isDirty: false } },
    )

    const cleanEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(cleanEvent)
    expect(cleanEvent.defaultPrevented).toBe(false)

    rerender({ isDirty: true })
    const dirtyEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirtyEvent)
    expect(dirtyEvent.defaultPrevented).toBe(true)

    unmount()
  })
})
