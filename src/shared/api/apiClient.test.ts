import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './apiClient'
import { resetCurrentUser, setCurrentUser } from './currentUser'

afterEach(() => {
  resetCurrentUser()
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  it('adds the default headers and returns the original response', async () => {
    const response = new Response(JSON.stringify({ ok: true }), { status: 200 })
    const fetchMock = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiFetch('/api/example')

    expect(result).toBe(response)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/example')
    const headers = new Headers(init.headers)
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.get('X-User')).toBe('admin')
  })

  it('preserves request options and caller headers', async () => {
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

  it('locks X-User to the current bridge identity', async () => {
    setCurrentUser({ username: 'operator', role: 'operator' })
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/api/example', {
      headers: { 'X-User': 'spoofed-user' },
    })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new Headers(init.headers).get('X-User')).toBe('operator')
  })

  it('propagates fetch failures', async () => {
    const error = new TypeError('Network unavailable')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))

    await expect(apiFetch('/api/example')).rejects.toBe(error)
  })
})
