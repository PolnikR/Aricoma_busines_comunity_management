/// <reference types="vite/client" />

interface AppConfig {
  readonly KEYCLOAK_URL: string
  readonly KEYCLOAK_REALM: string
  readonly KEYCLOAK_CLIENT_ID: string
  readonly AUTH_ENABLED?: string
}

interface Window {
  readonly __APP_CONFIG__: AppConfig
}
