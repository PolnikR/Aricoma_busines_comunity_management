import { describe, expect, it } from 'vitest'
import {
  PLATFORM_PROVIDER_COMMON_FIELDS,
  PLATFORM_PROVIDER_FIELD_CONTRACT,
  PLATFORM_PROVIDER_TYPES,
} from './platformProviderTypes'

describe('platform provider type contract', () => {
  it('exposes only orchestration platform-provider types', () => {
    expect(PLATFORM_PROVIDER_TYPES).toEqual(['AIRFLOW', 'SMTP', 'BACKEND', 'KEYCLOAK'])
    expect(PLATFORM_PROVIDER_TYPES).not.toContain('VMWARE')
    expect(PLATFORM_PROVIDER_TYPES).not.toContain('FLASHCOPY')
    expect(PLATFORM_PROVIDER_TYPES).not.toContain('IBM_POWER')
  })

  it('defines one exact field owner list per platform-provider type', () => {
    expect(PLATFORM_PROVIDER_COMMON_FIELDS).toEqual(['id', 'name', 'description', 'type', 'url'])
    expect(PLATFORM_PROVIDER_FIELD_CONTRACT).toEqual({
      AIRFLOW: ['ipAddress', 'port', 'dagDir', 'credentialId', 'notificationEmail'],
      SMTP: ['ipAddress', 'port', 'fromEmail', 'disableSsl', 'disableTls'],
      BACKEND: ['notificationEmail', 'loggingEnabled', 'jwtEnabled', 'swaggerEnabled'],
      KEYCLOAK: ['realm', 'clientId', 'credentialId'],
    })
  })

})
