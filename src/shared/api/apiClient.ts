import { keycloak } from '@/config/keycloak'

function reauthenticate() {
  void keycloak.logout({ redirectUri: window.location.origin })
}

// Single choke point for backend calls. Refreshes the in-memory Keycloak token,
// injects locked authentication/identity headers, then delegates to fetch.
// Returns the raw Response — callers keep their own .ok checks, status branching,
// and Zod parsing unchanged.
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
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

  const headers = new Headers({ Accept: 'application/json' })
  // Caller-supplied headers (e.g. Content-Type) override the defaults.
  new Headers(init.headers).forEach((value, key) => {
    headers.set(key, value)
  })
  // Authentication and legacy identity headers are set LAST so callers cannot
  // override either migration contract.
  headers.set('Authorization', `Bearer ${token}`)
  headers.set('X-User', 'admin')

  return fetch(input, { ...init, headers })
}
