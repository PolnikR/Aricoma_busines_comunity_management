import { describe, expect, it } from 'vitest'
import { getProviderById, PROVIDERS } from './providerRegistry'
import { providerTypeLabel } from '../helpers/providerTypeLabel'

describe('provider registry helpers', () => {
  it('finds a registered provider by id', () => {
    expect(getProviderById('vmware-vcenter')).toBe(PROVIDERS[0])
    expect(getProviderById('missing')).toBeUndefined()
  })

  it('formats known provider types and preserves unknown values', () => {
    expect(providerTypeLabel('VMWARE')).toBe('VMware')
    expect(providerTypeLabel('FLASHCOPY')).toBe('FlashCopy')
    expect(providerTypeLabel('CUSTOM')).toBe('CUSTOM')
  })
})
