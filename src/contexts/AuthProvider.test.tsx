import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { KeycloakProfile } from 'keycloak-js'
import { LanguageProvider } from './LanguageProvider'
import { AuthProvider } from './AuthProvider'
import { useAuthContext } from './AuthContext'

const keycloakMock = vi.hoisted(() => ({
  init: vi.fn(),
  loadUserProfile: vi.fn(),
  updateToken: vi.fn(),
  logout: vi.fn(),
  onTokenExpired: undefined as (() => void) | undefined,
}))

vi.mock('@/config/keycloak', () => ({ keycloak: keycloakMock }))

function AuthDetails() {
  const { status, user } = useAuthContext()

  return <div>{status === 'authenticated' ? `${user.displayName}|${user.email}` : status}</div>
}

function TestProviders({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    keycloakMock.onTokenExpired = undefined
    keycloakMock.init.mockResolvedValue(true)
  })

  it('loads the authenticated Keycloak profile before rendering children', async () => {
    const profile: KeycloakProfile = {
      id: 'user-123',
      username: 'jane.doe',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
    }
    keycloakMock.loadUserProfile.mockResolvedValue(profile)

    render(
      <TestProviders>
        <AuthProvider>
          <AuthDetails />
        </AuthProvider>
      </TestProviders>,
    )

    expect(await screen.findByText('Jane Doe|jane.doe@example.com')).toBeInTheDocument()
    expect(keycloakMock.init).toHaveBeenCalledWith({
      onLoad: 'login-required',
      pkceMethod: false,
      checkLoginIframe: false,
    })
    expect(keycloakMock.loadUserProfile).toHaveBeenCalledOnce()
  })

  it('keeps an authenticated app available when profile loading fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    keycloakMock.loadUserProfile.mockRejectedValue(new Error('profile unavailable'))

    render(
      <TestProviders>
        <AuthProvider>
          <AuthDetails />
        </AuthProvider>
      </TestProviders>,
    )

    expect(await screen.findByText('ABCO operator|')).toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith('keycloak profile load failed', expect.any(Error))
    consoleError.mockRestore()
  })

  it('logs out when an expired token cannot be refreshed', async () => {
    keycloakMock.loadUserProfile.mockResolvedValue({ username: 'jane.doe' })
    keycloakMock.updateToken.mockRejectedValue(new Error('refresh failed'))

    render(
      <TestProviders>
        <AuthProvider>
          <AuthDetails />
        </AuthProvider>
      </TestProviders>,
    )

    await screen.findByText('jane.doe|jane.doe')
    keycloakMock.onTokenExpired?.()

    await waitFor(() => {
      expect(keycloakMock.updateToken).toHaveBeenCalledWith(30)
      expect(keycloakMock.logout).toHaveBeenCalledWith({ redirectUri: window.location.origin })
    })
  })
})
