import { describe, expect, it } from 'vitest'
import { PROVIDER_TYPES } from './providerTypes'

describe('PROVIDER_TYPES', () => {
  it('contains every provider type supported by the form', () => {
    expect(PROVIDER_TYPES).toEqual(['VMWARE', 'FLASHCOPY', 'IBM_POWER'])
  })
})
