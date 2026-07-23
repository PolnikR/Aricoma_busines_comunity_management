import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useResizablePanel } from './useResizablePanel'

describe('useResizablePanel', () => {
  it('starts at the default width', () => {
    const { result } = renderHook(() => useResizablePanel({ open: true }))
    expect(result.current.width).toBe(420)
  })

  it('widens on ArrowLeft and narrows on ArrowRight, clamped to bounds', () => {
    const { result } = renderHook(() => useResizablePanel({ open: true }))
    const preventDefault = () => undefined

    act(() => { result.current.handleProps.onKeyDown({ key: 'ArrowLeft', preventDefault } as React.KeyboardEvent) })
    expect(result.current.width).toBe(436)

    act(() => { result.current.handleProps.onKeyDown({ key: 'ArrowRight', preventDefault } as React.KeyboardEvent) })
    expect(result.current.width).toBe(420)
  })

  it('does not exceed the maximum width', () => {
    const { result } = renderHook(() => useResizablePanel({ open: true, defaultWidth: 715, maxWidth: 720, step: 16 }))
    act(() => { result.current.handleProps.onKeyDown({ key: 'ArrowLeft', preventDefault: () => undefined } as React.KeyboardEvent) })
    expect(result.current.width).toBe(720)
  })

  it('resets to the default width when the panel closes', () => {
    const { result, rerender } = renderHook(({ open }) => useResizablePanel({ open }), { initialProps: { open: true } })
    act(() => { result.current.handleProps.onKeyDown({ key: 'ArrowLeft', preventDefault: () => undefined } as React.KeyboardEvent) })
    expect(result.current.width).toBe(436)

    rerender({ open: false })
    expect(result.current.width).toBe(420)
  })
})
