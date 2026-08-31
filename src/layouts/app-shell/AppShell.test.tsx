import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
})
