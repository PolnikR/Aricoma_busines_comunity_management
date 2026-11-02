import { OrchestrationProvider } from '@/generated/query/zod'
import { PLATFORM_PROVIDER_TYPES } from '../model/platformProviderTypes'
import { describe, expect, it } from 'vitest'
import { EMPTY_PLATFORM_PROVIDER_FORM, toPlatformProviderFormData } from '../model/platformProviderForm'
import { toPlatformProviderSubmitData } from './platformProviderSubmitMapper'

const common = {
  ...EMPTY_PLATFORM_PROVIDER_FORM,
  id: 'provider-01',
  name: 'Provider',
  description: 'Description',
  url: 'http://provider.example.test',
}

describe('toPlatformProviderSubmitData', () => {
  it.each(PLATFORM_PROVIDER_TYPES)('maps common fields for %s against the API schema', type => {
    for (const [notificationEmail, cacheRefreshSeconds, expectedEmail, expectedInterval] of [
      [' alerts@example.test ', '60', 'alerts@example.test', 60],
      ['', '', null, null],
      ['   ', '   ', null, null],
    ] as const) {
      const payload = toPlatformProviderSubmitData({ ...common, type, notificationEmail, cacheRefreshSeconds })
      expect(payload).toMatchObject({ notificationEmail: expectedEmail, cacheRefreshSeconds: expectedInterval })
      expect(OrchestrationProvider.safeParse(payload).success).toBe(true)
    }
  })

  it('builds an exact AIRFLOW payload', () => {
    const payload = toPlatformProviderSubmitData({
      ...common,
      type: 'AIRFLOW',
      ipAddress: '10.0.0.1',
      port: '22',
      dagDir: '/opt/airflow/dags',
      credentialId: 'airflow-ssh',
      notificationEmail: 'platform@example.test',
      loggingEnabled: true,
      realm: 'must-not-leak',
    })

    expect(payload).toEqual({
      id: 'provider-01',
      name: 'Provider',
      description: 'Description',
      type: 'AIRFLOW',
      url: 'http://provider.example.test',
      cacheRefreshSeconds: null,
      ipAddress: '10.0.0.1',
      port: 22,
      dagDir: '/opt/airflow/dags',
      credentialId: 'airflow-ssh',
      notificationEmail: 'platform@example.test',
    })
  })

  it('builds an exact SMTP payload', () => {
    const payload = toPlatformProviderSubmitData({
      ...common,
      type: 'SMTP',
      ipAddress: '10.0.0.2',
      port: '1025',
      fromEmail: 'airflow@example.test',
      disableSsl: true,
      disableTls: false,
      dagDir: '/must/not/leak',
    })

    expect(payload).toEqual({
      id: 'provider-01',
      name: 'Provider',
      description: 'Description',
      type: 'SMTP',
      notificationEmail: null,
      url: 'http://provider.example.test',
      cacheRefreshSeconds: null,
      ipAddress: '10.0.0.2',
      port: 1025,
      fromEmail: 'airflow@example.test',
      disableSsl: true,
      disableTls: false,
    })
  })

  it('builds an exact BACKEND payload and preserves false flags', () => {
    const payload = toPlatformProviderSubmitData({
      ...common,
      id: 'backend',
      type: 'BACKEND',
      notificationEmail: '',
      loggingEnabled: true,
      jwtEnabled: false,
      ipAddress: 'must-not-leak',
    })

    expect(payload).toEqual({
      id: 'backend',
      name: 'Provider',
      description: 'Description',
      type: 'BACKEND',
      url: 'http://provider.example.test',
      cacheRefreshSeconds: null,
      notificationEmail: null,
      loggingEnabled: true,
      jwtEnabled: false,
    })
  })

  it('discards a stored Swagger flag when editing a BACKEND provider', () => {
    const form = toPlatformProviderFormData({
      id: 'backend',
      name: 'Backend',
      type: 'BACKEND',
      role: 'source',
      port: 22,
      credentialStatus: 'none',
      loggingEnabled: true,
      jwtEnabled: false,
      swaggerEnabled: true,
    })

    expect(form).not.toHaveProperty('swaggerEnabled')
    expect(toPlatformProviderSubmitData(form)).toEqual({
      id: 'backend',
      name: 'Backend',
      description: '',
      type: 'BACKEND',
      url: null,
      notificationEmail: null,
      cacheRefreshSeconds: null,
      loggingEnabled: true,
      jwtEnabled: false,
    })
  })

  it('builds an exact KEYCLOAK payload', () => {
    const payload = toPlatformProviderSubmitData({
      ...common,
      type: 'KEYCLOAK',
      realm: 'aricoma',
      clientId: 'abco-be',
      credentialId: 'keycloak-admin',
      fromEmail: 'must-not-leak@example.test',
    })

    expect(payload).toEqual({
      id: 'provider-01',
      name: 'Provider',
      description: 'Description',
      type: 'KEYCLOAK',
      notificationEmail: null,
      url: 'http://provider.example.test',
      cacheRefreshSeconds: null,
      realm: 'aricoma',
      clientId: 'abco-be',
      credentialId: 'keycloak-admin',
    })
  })

  it('sends null for a cleared optional SMTP from address without adding unrelated keys', () => {
    const payload = toPlatformProviderSubmitData({
      ...common,
      type: 'SMTP',
      ipAddress: '10.0.0.2',
      port: '1025',
      fromEmail: '   ',
      disableSsl: false,
      disableTls: true,
    })

    expect(payload).toEqual({
      id: 'provider-01',
      name: 'Provider',
      description: 'Description',
      type: 'SMTP',
      notificationEmail: null,
      url: 'http://provider.example.test',
      cacheRefreshSeconds: null,
      ipAddress: '10.0.0.2',
      port: 1025,
      fromEmail: null,
      disableSsl: false,
      disableTls: true,
    })
  })

  it('sends null for cleared KEYCLOAK strings without adding unrelated keys', () => {
    const payload = toPlatformProviderSubmitData({
      ...common,
      type: 'KEYCLOAK',
      realm: ' ',
      clientId: '',
      credentialId: '   ',
    })

    expect(payload).toEqual({
      id: 'provider-01',
      name: 'Provider',
      description: 'Description',
      type: 'KEYCLOAK',
      notificationEmail: null,
      url: 'http://provider.example.test',
      cacheRefreshSeconds: null,
      realm: null,
      clientId: null,
      credentialId: null,
    })
  })
})
