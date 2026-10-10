import { isAuthEnabled } from '@/config/authEnabled'
import { keycloak } from '@/config/keycloak'

function reauthenticate() {
  void keycloak.logout({ redirectUri: window.location.origin }).catch(() => undefined)
}

// Caller-supplied headers (e.g. Content-Type) override the defaults; the locked
// headers are set LAST so callers cannot override them.
function fetchWithHeaders(
  input: string,
  init: RequestInit,
  lockedHeaders: Record<string, string>,
): Promise<Response> {
  const headers = new Headers({ Accept: 'application/json' })
  new Headers(init.headers).forEach((value, key) => {
    headers.set(key, value)
  })
  for (const [key, value] of Object.entries(lockedHeaders)) {
    headers.set(key, value)
  }
  return fetch(input, { ...init, headers })
}

// Single choke point for backend calls. Refreshes the in-memory Keycloak token,
// injects the locked Authorization header (or X-User: admin when AUTH_ENABLED=false,
// the backend developer bypass, with no Keycloak involved), then delegates to fetch.
// Returns the raw Response — callers keep their own .ok checks, status branching,
// and Zod parsing unchanged.
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  if (!isAuthEnabled()) {
    return fetchWithHeaders(input, init, { 'X-User': 'admin' })
  }

  try {
    await keycloak.updateToken(30)
  } catch (error: unknown) {
    reauthenticate()
    throw error
  }

  const token = keycloak.token
  if (!token) {
    reauthenticate()
    throw new Error('Keycloak access token is unavailable')
  }

  return fetchWithHeaders(input, init, { Authorization: `Bearer ${token}` })
}
