import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, createRoutesFromElements, Outlet, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AppRoutes } from './AppRoutes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
// Only the routing is under test: render the shell as a bare outlet and stub the page.
vi.mock('@/layouts/app-shell/AppShell', () => ({ AppShell: () => <Outlet /> }))
vi.mock('@/features/discovery-inventory/discovery-settings/pages/DiscoverySettingsPage', () => ({
  DiscoverySettingsPage: () => <h1>Discovery settings page</h1>,
}))

function renderAt(entry: string) {
  const router = createMemoryRouter(createRoutesFromElements(AppRoutes()), { initialEntries: [entry] })
  render(<RouterProvider router={router} />)
  return router
}

function currentUrl(router: ReturnType<typeof renderAt>) {
  const { pathname, search, hash } = router.state.location
  return `${pathname}${search}${hash}`
}

describe('Discovery Settings routes', () => {
  it('renders Discovery Settings on its Discovery & Inventory route', async () => {
    const router = renderAt('/discovery-inventory/discovery-settings?tab=notifications')

    expect(await screen.findByRole('heading', { name: 'Discovery settings page' })).toBeInTheDocument()
    expect(currentUrl(router)).toBe('/discovery-inventory/discovery-settings?tab=notifications')
    router.dispose()
  })

  it('redirects the legacy Providers & Connectors URL and keeps tab, providerId and hash', async () => {
    const router = renderAt('/providers-connectors/discovery-settings?tab=history&providerId=vmware-01#x')

    await waitFor(() => {
      expect(currentUrl(router)).toBe('/discovery-inventory/discovery-settings?tab=history&providerId=vmware-01#x')
    })
    expect(await screen.findByRole('heading', { name: 'Discovery settings page' })).toBeInTheDocument()
    router.dispose()
  })

  it('redirects the legacy URL without a query string to the bare new route', async () => {
    const router = renderAt('/providers-connectors/discovery-settings')

    await waitFor(() => {
      expect(currentUrl(router)).toBe('/discovery-inventory/discovery-settings')
    })
    router.dispose()
  })
})
