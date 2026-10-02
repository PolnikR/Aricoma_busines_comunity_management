import { describe, expect, it } from 'vitest'
import { isComputeProviderType, isPartnerProviderType, isStorageProviderType } from './providerCategory'

describe('provider category', () => {
  it.each([
    ['VMWARE', true, false, false],
    ['IBM_POWER', true, false, false],
    ['FLASHCOPY', false, true, true],
    ['HITACHI', false, true, false],
  ])('classifies %s as compute=%s storage=%s partner=%s', (type, compute, storage, partner) => {
    expect(isComputeProviderType(type)).toBe(compute)
    expect(isStorageProviderType(type)).toBe(storage)
    expect(isPartnerProviderType(type)).toBe(partner)
  })

  it.each(['', 'AIRFLOW', 'unknown'])('treats %j as no category', (type) => {
    expect(isComputeProviderType(type)).toBe(false)
    expect(isStorageProviderType(type)).toBe(false)
    expect(isPartnerProviderType(type)).toBe(false)
  })
})
