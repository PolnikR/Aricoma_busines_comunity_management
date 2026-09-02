import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  PLATFORM_PROVIDER_COMMON_FIELDS,
  PLATFORM_PROVIDER_FIELD_CONTRACT,
  PLATFORM_PROVIDER_TYPES,
} from './platformProviderTypes'
import type {
  BackendPlatformProvider,
  KeycloakPlatformProvider,
  SmtpPlatformProvider,
} from './platformProviderTypes'
import { platformProviderSubmitSchema } from '../api/schemas/platformProvidersSchema'

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

  it('keeps type-specific fields unavailable on unrelated variants', () => {
    expectTypeOf<KeycloakPlatformProvider['realm']>().toEqualTypeOf<string>()
    expectTypeOf<KeycloakPlatformProvider['dagDir']>().toEqualTypeOf<undefined>()
    expectTypeOf<SmtpPlatformProvider['loggingEnabled']>().toEqualTypeOf<undefined>()
    expectTypeOf<BackendPlatformProvider['swaggerEnabled']>().toEqualTypeOf<boolean | null>()
  })
})

describe('platformProviderSubmitSchema notificationEmail', () => {
  const base = {
    id: 'airflow-1',
    name: 'Airflow',
    description: 'Description',
    type: 'AIRFLOW' as const,
    ipAddress: '10.0.0.1',
    port: 22,
    dagDir: '/opt/airflow/dags',
    credentialId: 'credential-1',
  }

  it('accepts null notificationEmail', () => {
    expect(platformProviderSubmitSchema.parse({ ...base, notificationEmail: null }).notificationEmail).toBeNull()
  })

  it('rejects an invalid notificationEmail', () => {
    expect(() => platformProviderSubmitSchema.parse({ ...base, notificationEmail: 'invalid' })).toThrow()
  })

  it('accepts the optional SMTP fields from the OpenAPI schema', () => {
    expect(platformProviderSubmitSchema.parse({
      id: 'smtp-1',
      name: 'SMTP',
      type: 'SMTP',
      port: 1025,
      fromEmail: 'airflow@example.com',
      disableSsl: true,
      disableTls: true,
    })).toMatchObject({
      type: 'SMTP',
      fromEmail: 'airflow@example.com',
      disableSsl: true,
      disableTls: true,
    })
  })
})
