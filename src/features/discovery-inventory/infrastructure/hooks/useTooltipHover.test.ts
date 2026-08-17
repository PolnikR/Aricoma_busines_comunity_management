import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTooltipHover } from './useTooltipHover'

afterEach(() => {
  vi.useRealTimers()
})

describe('useTooltipHover', () => {
  it('shows after the configured delay and hides immediately', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTooltipHover({ delay: 200 }))

    act(() => {
      result.current.handleMouseEnter()
      vi.advanceTimersByTime(199)
    })
    expect(result.current.showTooltip).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.showTooltip).toBe(true)

    act(() => {
      result.current.handleMouseLeave()
    })
    expect(result.current.showTooltip).toBe(false)
  })

  it('cancels a pending tooltip when the pointer leaves', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTooltipHover({ delay: 100 }))

    act(() => {
      result.current.handleMouseEnter()
      result.current.handleMouseLeave()
      vi.advanceTimersByTime(100)
    })

    expect(result.current.showTooltip).toBe(false)
  })
})
