import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'

const routeMatches = vi.hoisted(() => ({
  current: [] as { handle?: unknown }[],
}))

vi.mock('react-router', () => ({
  Outlet: () => <div data-testid="outlet" />,
  useMatches: () => routeMatches.current,
}))

vi.mock('./AppHeader', () => ({
  AppHeader: () => <div data-testid="app-header" />,
}))

vi.mock('./AppSidebar', () => ({
  AppSidebar: () => <div data-testid="app-sidebar" />,
}))

vi.mock('./useSidebar', () => ({
  useSidebar: () => ({ isMobileOpen: false, closeMobileSidebar: vi.fn() }),
}))

describe('AppShell', () => {
  beforeEach(() => {
    routeMatches.current = []
  })

  it('uses contained desktop scrolling for routes that opt in', () => {
    routeMatches.current = [{ handle: { contentScroll: 'contained' } }]

    const { container } = render(<AppShell />)
    const main = container.querySelector('main')
    const outletParent = main?.firstElementChild

    expect(main).toHaveClass('lg:overflow-hidden')
    expect(main).not.toHaveClass('lg:overflow-auto')
    expect(outletParent).toHaveClass('lg:min-h-0')
    expect(outletParent).not.toHaveClass('lg:min-h-min')
  })

  it('keeps the page scroll fallback for default routes', () => {
    const { container } = render(<AppShell />)
    const main = container.querySelector('main')
    const outletParent = main?.firstElementChild

    expect(main).toHaveClass('lg:overflow-auto')
    expect(main).not.toHaveClass('lg:overflow-hidden')
    expect(outletParent).toHaveClass('lg:min-h-min')
    expect(outletParent).not.toHaveClass('lg:min-h-0')
  })

  describe('content surface contract', () => {
    let rect = { left: 0, width: 0 }
    let observed: Element | undefined
    let notify: (() => void) | undefined
    const disconnect = vi.fn()

    beforeEach(() => {
      observed = undefined
      notify = undefined
      vi.stubGlobal('ResizeObserver', class {
        constructor(callback: () => void) {
          notify = callback
        }
        observe(element: Element) {
          observed = element
        }
        disconnect = disconnect
      })
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => DOMRect.fromRect({ x: rect.left, width: rect.width, height: 868 }))
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
    })

    const shellVariables = (shell: HTMLElement) => ({
      left: shell.style.getPropertyValue('--app-content-left'),
      width: shell.style.getPropertyValue('--app-content-width'),
    })

    it('publishes the measured content surface and follows sidebar width changes', () => {
      // Expanded sidebar at 1440 px: the section starts right of the sidebar slot.
      rect = { left: 304, width: 1120 }
      const { container, unmount } = render(<AppShell />)
      const shell = container.firstElementChild as HTMLElement
      const section = container.querySelector('section')

      expect(observed).toBe(section)
      expect(shellVariables(shell)).toEqual({ left: '304px', width: '1120px' })

      // Collapsed rail: the section grows, the observer re-publishes.
      rect = { left: 104, width: 1320 }
      notify?.()
      expect(shellVariables(shell)).toEqual({ left: '104px', width: '1320px' })

      // Narrow layout: the off-canvas sidebar leaves the section full width.
      rect = { left: 0, width: 800 }
      notify?.()
      expect(shellVariables(shell)).toEqual({ left: '0px', width: '800px' })

      unmount()
      expect(disconnect).toHaveBeenCalled()
    })

    it('still measures once without ResizeObserver', () => {
      vi.stubGlobal('ResizeObserver', undefined)
      rect = { left: 304, width: 1120 }
      const { container } = render(<AppShell />)

      expect(shellVariables(container.firstElementChild as HTMLElement)).toEqual({ left: '304px', width: '1120px' })
    })
  })
})
