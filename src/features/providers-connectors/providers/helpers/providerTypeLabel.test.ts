import { describe, expect, it } from 'vitest'
import { providerTypeLabel } from './providerTypeLabel'

describe('providerTypeLabel', () => {
  it.each([
    ['VMWARE', 'VMware'],
    ['FLASHCOPY', 'FlashCopy'],
    ['IBM_POWER', 'IBM Power'],
    ['CUSTOM', 'CUSTOM'],
  ])('maps %s to %s', (type, label) => {
    expect(providerTypeLabel(type)).toBe(label)
  })
})
