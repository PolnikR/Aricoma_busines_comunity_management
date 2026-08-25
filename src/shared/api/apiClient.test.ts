import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './apiClient'

const keycloakMock = vi.hoisted(() => {
  const mock: {
    token: string | undefined
    updateToken: ReturnType<typeof vi.fn>
    logout: ReturnType<typeof vi.fn>
  } = {
    token: 'initial-token',
    updateToken: vi.fn(),
    logout: vi.fn(),
  }
  return mock
})

vi.mock('@/config/keycloak', () => ({ keycloak: keycloakMock }))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('window', { location: { origin: 'http://localhost' } })
    keycloakMock.token = 'refreshed-token'
    keycloakMock.updateToken.mockResolvedValue(true)
    keycloakMock.logout.mockResolvedValue(undefined)
  })

  it('refreshes the token before fetch and sends locked auth headers', async () => {
    const response = new Response(JSON.stringify({ ok: true }), { status: 200 })
    const fetchMock = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', fetchMock)

    keycloakMock.updateToken.mockImplementation(() => {
      expect(fetchMock).not.toHaveBeenCalled()
      keycloakMock.token = 'new-access-token'
    })

    const result = await apiFetch('/api/example', {
      headers: {
        Authorization: 'Bearer caller-token',
        'X-User': 'spoofed-user',
      },
    })

    expect(result).toBe(response)
    expect(keycloakMock.updateToken).toHaveBeenCalledWith(30)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/example')
    const headers = new Headers(init.headers)
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.get('Authorization')).toBe('Bearer new-access-token')
    expect(headers.get('X-User')).toBe('admin')
  })

  it('preserves request options and caller headers that are not locked', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    await apiFetch('/api/example', {
      method: 'POST',
      body: '{"name":"test"}',
      signal: controller.signal,
      headers: {
        Accept: 'application/problem+json',
        'Content-Type': 'application/json',
      },
    })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init).toMatchObject({
      method: 'POST',
      body: '{"name":"test"}',
      signal: controller.signal,
    })
    const headers = new Headers(init.headers)
    expect(headers.get('Accept')).toBe('application/problem+json')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('stops the request and logs out when token refresh fails', async () => {
    const refreshError = new Error('refresh failed')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    keycloakMock.updateToken.mockRejectedValue(refreshError)

    await expect(apiFetch('/api/example')).rejects.toBe(refreshError)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(keycloakMock.logout).toHaveBeenCalledWith({ redirectUri: window.location.origin })
  })

  it('preserves the refresh failure when the reauthentication logout also fails', async () => {
    const refreshError = new Error('refresh failed')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    keycloakMock.updateToken.mockRejectedValue(refreshError)
    keycloakMock.logout.mockRejectedValue(new Error('logout failed'))

    await expect(apiFetch('/api/example')).rejects.toBe(refreshError)
    await Promise.resolve()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(keycloakMock.logout).toHaveBeenCalledWith({ redirectUri: window.location.origin })
  })

  it('stops the request and logs out when no access token is available', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    keycloakMock.token = undefined

    await expect(apiFetch('/api/example')).rejects.toThrow('Keycloak access token is unavailable')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(keycloakMock.logout).toHaveBeenCalledWith({ redirectUri: window.location.origin })
  })

  it('propagates fetch failures after successful token refresh', async () => {
    const error = new TypeError('Network unavailable')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))

    await expect(apiFetch('/api/example')).rejects.toBe(error)
    expect(keycloakMock.logout).not.toHaveBeenCalled()
  })
})
