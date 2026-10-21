import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import { routes } from '../routes'
import { platformAdministrationRoutes } from './platformAdministrationRoutes'

vi.mock('@/features/platform-administration/platform-providers/pages/PlatformProvidersPage', () => ({
  PlatformProvidersPage: () => <div>Platform providers page</div>,
}))
vi.mock('@/features/platform-administration/identity-access/pages/IdentityAccessPage', () => ({
  IdentityAccessPage: () => <div>Identity and access page</div>,
}))

function CurrentPath() {
  const location = useLocation()
  return <output data-testid="current-path">{location.pathname}</output>
}

function renderIdentityAccessRoute() {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={[routes.platformIdentityAccess]}>
        <CurrentPath />
        <Routes>{platformAdministrationRoutes()}</Routes>
      </MemoryRouter>
    </LanguageProvider>,
  )
}

describe('Identity & Access route visibility', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('redirects a direct Identity & Access URL to Platform Providers when auth is disabled', async () => {
    vi.stubGlobal('__APP_CONFIG__', { AUTH_ENABLED: 'false' })
    renderIdentityAccessRoute()

    expect(await screen.findByText('Platform providers page')).toBeInTheDocument()
    expect(screen.getByTestId('current-path')).toHaveTextContent(routes.platformProviders)
    expect(screen.queryByText('Identity and access page')).not.toBeInTheDocument()
  })

  it('renders Identity & Access when auth is enabled', async () => {
    vi.stubGlobal('__APP_CONFIG__', { AUTH_ENABLED: 'true' })
    renderIdentityAccessRoute()

    expect(await screen.findByText('Identity and access page')).toBeInTheDocument()
    expect(screen.getByTestId('current-path')).toHaveTextContent(routes.platformIdentityAccess)
  })

  it('keeps Identity & Access available when AUTH_ENABLED is omitted', async () => {
    vi.stubGlobal('__APP_CONFIG__', {})
    renderIdentityAccessRoute()

    expect(await screen.findByText('Identity and access page')).toBeInTheDocument()
  })
})
