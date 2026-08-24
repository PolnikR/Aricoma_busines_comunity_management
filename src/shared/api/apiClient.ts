import { getCurrentUser } from './currentUser'

// Single choke point for backend calls. Injects a default Accept header and a
// locked X-User identity header, then delegates to the global fetch. Returns
// the raw Response — callers keep their own .ok checks, status branching, and
// Zod parsing unchanged.
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers({ Accept: 'application/json' })
  // Caller-supplied headers (e.g. Content-Type) override the defaults.
  new Headers(init.headers).forEach((value, key) => {
    headers.set(key, value)
  })
  // X-User is set LAST so it always wins — an identity header must not be
  // overridable by a caller.
  headers.set('X-User', getCurrentUser().username)
  return fetch(input, { ...init, headers })
}
