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
  // TEMPORARY: BE only recognizes "admin", not the real Keycloak username
  // (e.g. "superadmin"). Hardcode until BE supports the actual user.
  headers.set('X-User', 'admin')
  return fetch(input, { ...init, headers })
}
