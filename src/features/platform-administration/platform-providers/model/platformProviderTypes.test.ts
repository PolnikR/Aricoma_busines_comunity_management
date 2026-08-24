import { describe, expect, it } from 'vitest'
import { PLATFORM_PROVIDER_TYPES } from './platformProviderTypes'
import { platformProviderSubmitSchema } from '../api/schemas/platformProvidersSchema'

describe('PLATFORM_PROVIDER_TYPES', () => {
  it('contains only platform orchestration providers', () => {
    expect(PLATFORM_PROVIDER_TYPES).toEqual(['AIRFLOW'])
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
})
