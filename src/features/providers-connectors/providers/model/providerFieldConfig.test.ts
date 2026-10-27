import { describe, expect, it } from 'vitest'
import { getProviderFieldConfig } from './providerFieldConfig'

describe('provider field relevance', () => {
  it.each([
    ['VMWARE', true, true, true, false, false],
    ['FLASHCOPY', false, false, false, true, false],
    ['HITACHI', false, false, false, false, false],
    ['IBM_POWER', false, false, true, false, true],
    ['', false, false, false, false, false],
    ['AIRFLOW', false, false, false, false, false],
    ['unknown', false, false, false, false, false],
  ])('identifies the fields supported by %s', (type, vmPrefix, vmTags, backingStorageProviderIds, partnerProviderId, managedSystem) => {
    expect(getProviderFieldConfig(type)).toEqual({
      vmPrefix, vmTags, backingStorageProviderIds, partnerProviderId, managedSystem,
    })
  })
})
