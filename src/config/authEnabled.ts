// Runtime switch from config.js (AUTH_ENABLED env var in the Docker image).
// Anything other than the literal string "false" keeps Keycloak auth on.
export function isAuthEnabled(): boolean {
  // In Node.js unit tests there is no window object.
  if (typeof window === 'undefined') {
    return true
  }

  const config = window.__APP_CONFIG__ as Partial<AppConfig> | undefined
  return config?.AUTH_ENABLED !== 'false'
}
