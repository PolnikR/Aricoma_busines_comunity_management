import { apiFetch } from './apiClient'

export class OrvalApiError extends Error {
  public readonly status: number
  public readonly statusText: string
  public readonly body: unknown

  public constructor(status: number, statusText: string, body: unknown) {
    const suffix = body === undefined ? '' : `: ${typeof body === 'string' ? body : JSON.stringify(body)}`
    super(`API request failed with ${String(status)}${statusText ? ` ${statusText}` : ''}${suffix}`)
    this.name = 'OrvalApiError'
    this.status = status
    this.statusText = statusText
    this.body = body
  }
}

export function toOrvalRequestError(error: unknown, operation: string): Error {
  if (error instanceof OrvalApiError) {
    return new Error(`${operation} request failed with status ${String(error.status)}`, {
      cause: error,
    })
  }
  return error instanceof Error ? error : new Error(`${operation} request failed`)
}

function toProxyUrl(url: string): string {
  if (!url.startsWith('/') || url.startsWith('/api/')) return url
  return `/api${url}`
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205 || response.status === 304) return undefined

  const text = await response.text()
  if (!text) return undefined

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (contentType.includes('json') || text.startsWith('{') || text.startsWith('[')) {
    try {
      return JSON.parse(text) as unknown
    } catch {
      return text
    }
  }

  return text
}

export async function orvalMutator<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(toProxyUrl(url), options)
  const body = await readResponseBody(response)

  if (!response.ok) {
    throw new OrvalApiError(response.status, response.statusText, body)
  }

  return body as T
}
