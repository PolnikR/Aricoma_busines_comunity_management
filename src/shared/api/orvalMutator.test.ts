import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  OrvalApiError,
  orvalMutator,
  toOrvalRequestError,
} from './orvalMutator'

const mockedFetch = vi.fn()

describe('orvalMutator', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('fetch', mockedFetch)
  })

  it('routes generated backend paths through the Vite /api proxy', async () => {
    mockedFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))

    await expect(orvalMutator<{ ok: boolean }>('/get_providers?role=all', {
      method: 'GET',
    })).resolves.toEqual({ ok: true })

    expect(mockedFetch).toHaveBeenCalledWith('/api/get_providers?role=all', expect.objectContaining({
      method: 'GET',
    }))
  })

  it('keeps an already prefixed URL unchanged and supports empty responses', async () => {
    mockedFetch.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(orvalMutator<undefined>('/api/delete_provider?provider_id=provider-1', {
      method: 'DELETE',
    })).resolves.toBeUndefined()

    expect(mockedFetch).toHaveBeenCalledWith('/api/delete_provider?provider_id=provider-1', expect.objectContaining({
      method: 'DELETE',
    }))
  })

  it('throws a diagnostic error for non-success responses', async () => {
    mockedFetch.mockResolvedValue(new Response(JSON.stringify({ detail: 'not found' }), {
      status: 404,
      statusText: 'Not Found',
      headers: { 'content-type': 'application/json' },
    }))

    await expect(orvalMutator('/get_providers', { method: 'GET' })).rejects.toMatchObject({
      name: 'OrvalApiError',
      status: 404,
      body: { detail: 'not found' },
    } satisfies Partial<OrvalApiError>)
  })

  it('adds operation context to generated client errors', () => {
    const cause = new OrvalApiError(503, 'Unavailable', undefined)

    expect(toOrvalRequestError(cause, 'Get providers')).toMatchObject({
      message: 'Get providers request failed with status 503',
      cause,
    })
  })

  it('preserves ordinary errors and normalizes unknown failures', () => {
    const error = new Error('Network unavailable')

    expect(toOrvalRequestError(error, 'Get providers')).toBe(error)
    expect(toOrvalRequestError(null, 'Get providers')).toEqual(
      new Error('Get providers request failed'),
    )
  })
})
