import { describe, expect, it } from 'vitest'
import en from './en.json'
import sk from './sk.json'
import cs from './cs.json'

const requiredKeys = [
  'lpars', 'hosts', 'mappedVolumes', 'found', 'lparMissing', 'lparExists',
  'ownership.run', 'ownership.foreign', 'ownership.unattached', 'ownership.unknown',
  'coHolding', 'otherHosts', 'vfc', 'ethernet', 'activePorts', 'boot', 'flashcopy',
].map(key => `recoveryInventory.power.${key}`)
const sharedKeys = ['recoveryInventory.warnings', 'recoveryInventory.partial', 'recoveryInventory.unknownPlatform']

describe.each([{ language: 'en', catalog: en }, { language: 'sk', catalog: sk }, { language: 'cs', catalog: cs }])('Power inventory translations in $language', ({ catalog }) => {
  it('provides matching non-empty keys and interpolation placeholders', () => {
    const english: Record<string, string> = en
    const messages: Record<string, string> = catalog
    const keys = Object.keys(english).filter(key => key.startsWith('recoveryInventory.power.')).sort()
    expect(keys).toEqual(expect.arrayContaining(requiredKeys))
    expect(Object.keys(messages).filter(key => key.startsWith('recoveryInventory.power.')).sort()).toEqual(keys)
    for (const key of [...keys, ...sharedKeys]) {
      expect(messages[key]?.trim(), key).toBeTruthy()
      expect(messages[key]?.match(/\{\{[^}]+\}\}/g) ?? [], key).toEqual(english[key]?.match(/\{\{[^}]+\}\}/g) ?? [])
      expect(messages[key], key).not.toContain('\uFFFD')
    }
  })
})
