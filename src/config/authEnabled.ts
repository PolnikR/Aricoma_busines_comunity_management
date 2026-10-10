// Runtime switch from config.js (AUTH_ENABLED env var in the Docker image).
// Anything other than the literal string "false" keeps Keycloak auth on.
export function isAuthEnabled(): boolean {
  // config.js is absent under unit tests, so treat the config as optional.
  const config = window.__APP_CONFIG__ as Partial<AppConfig> | undefined
  return config?.AUTH_ENABLED !== 'false'
}
