import { describe, expect, it } from 'vitest'
import en from './en.json'
import cs from './cs.json'
import sk from './sk.json'

const englishCatalog: Record<string, string> = en
const catalogs: Record<string, Record<string, string>> = { en: englishCatalog, cs, sk }
const rollbackPrefixes = ['recoveryGroups.rollback.', 'recovery.application.rollback.']
const requiredResultKeys = [
  'recoveryGroups.rollback.resultTitle',
  'recoveryGroups.rollback.resultSubtitle',
  'recoveryGroups.rollback.status',
  'recovery.application.rollback.title',
  'recovery.application.rollback.subtitle',
]

function rollbackKeys(catalog: Record<string, string>) {
  return Object.keys(catalog)
    .filter(key => rollbackPrefixes.some(prefix => key.startsWith(prefix)))
    .sort()
}

function placeholders(value: string) {
  return [...value.matchAll(/\{[^{}]+\}/g)].map(match => match[0]).sort()
}

describe('recovery rollback translations', () => {
  it('provides the complete rollback key set in every locale', () => {
    const expectedKeys = rollbackKeys(englishCatalog)

    for (const catalog of Object.values(catalogs)) {
      expect(rollbackKeys(catalog)).toEqual(expectedKeys)
      expect(requiredResultKeys.every(key => catalog[key]?.trim())).toBe(true)
    }
  })

  it('preserves English interpolation placeholders in every locale', () => {
    for (const key of rollbackKeys(englishCatalog)) {
      const expectedPlaceholders = placeholders(englishCatalog[key] ?? '')

      for (const catalog of Object.values(catalogs)) {
        expect(placeholders(catalog[key] ?? ''), key).toEqual(expectedPlaceholders)
      }
    }
  })
})
