import { describe, expect, it } from 'vitest'
import { PROVIDER_TYPES } from './providerTypes'
import { providerSubmitSchema } from '../api/schemas/providersSchema'

describe('PROVIDER_TYPES', () => {
  it('contains every provider type supported by the form', () => {
    expect(PROVIDER_TYPES).toEqual(['VMWARE', 'FLASHCOPY', 'IBM_POWER'])
  })
})

describe('providerSubmitSchema notificationEmail', () => {
  const base = {
    id: 'provider-1',
    name: 'Provider',
    description: 'Description',
    type: 'VMWARE' as const,
    ipAddress: '10.0.0.1',
    credentialId: null,
    role: 'source' as const,
  }

  it('accepts null notificationEmail', () => {
    expect(providerSubmitSchema.parse({ ...base, notificationEmail: null }).notificationEmail).toBeNull()
  })

  it('rejects an invalid notificationEmail', () => {
    expect(() => providerSubmitSchema.parse({ ...base, notificationEmail: 'invalid' })).toThrow()
  })
})
